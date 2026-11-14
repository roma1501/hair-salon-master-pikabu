// Game.js — «Hair Salon Master»: режимы (зал / стрижка / итог), камера, экономика, уровни и
// коробки с новинками, обучение, сохранение, связь с интерфейсом (шина событий Game.on / Game.emit).
//
// Модули игры: GameHair (волосы), GameChar (персонаж), GameData (данные), GameSalon (зал и клиенты),
// GameCut (стрижка крупным планом), GameFx (эффекты), GameUI (интерфейс).

// Карточка обучения в стиле игры: кремовый «талон» с полосатой каймой барбер-пола, жёлтые клавиши, зелёный прогресс.
const GAME_TUTORIAL_CSS = [
    ".lory-tut{--tut-font:'Nunito',system-ui,sans-serif;--tut-bg:#fff4e0;--tut-fg:#27314f;--tut-border:#27314f;--tut-accent:#3ecf6a;--tut-radius:22px}",
    '.lory-tut-card{border-width:4px;padding:12px 16px 12px 26px;overflow:hidden;box-shadow:0 6px 0 #27314f,0 12px 22px rgba(39,49,79,.3)}',
    ".lory-tut-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:12px;border-right:3px solid #27314f;",
    'background:repeating-linear-gradient(-45deg,#ff6b6b 0 8px,#fff4e0 8px 16px,#23c4c9 16px 24px,#fff4e0 24px 32px)}',
    '.lory-tut-title{font-weight:1000;letter-spacing:.01em;color:#27314f}',
    '.lory-tut-hint{font-weight:800;color:#4b5680;line-height:1.75}',
    '.lory-tut-hint svg{color:#23c4c9}',
    '.lory-tut-key{background:#ffd23f;color:#27314f;border:2px solid #27314f;box-shadow:0 3px 0 #27314f;font-weight:900}',
    '.lory-tut-skip{background:#fff;color:#27314f;border:3px solid #27314f;box-shadow:0 4px 0 #27314f;font-weight:900;transition:transform .08s}',
    '.lory-tut-skip:active{transform:translateY(3px);box-shadow:0 1px 0 #27314f}',
    '.lory-tut-skip kbd{background:#27314f;color:#fff;font-weight:800}',
    '.lory-tut-bar{height:12px;background:#e9dfcb;border:2px solid #27314f}',
    '.lory-tut-bar i{background:repeating-linear-gradient(-45deg,#3ecf6a 0 8px,#7fe59c 8px 16px)}',
    '.lory-tut-dots{gap:6px}',
    '.lory-tut-dots i{width:10px;height:10px;box-sizing:border-box;background:#e9dfcb;border:2px solid #27314f}',
    '.lory-tut-dots i.done{background:#3ecf6a}',
    '.lory-tut-dots i.cur{background:#ffd23f;transform:scale(1.35)}',
    '.lory-tut-card.lory-tut-ok{background:#e6ffe9}',
    '.lory-tut-pointer,.lory-tut-edge{color:#ffd23f;filter:drop-shadow(0 3px 0 #27314f) drop-shadow(0 0 2px #27314f)}',
    '.lory-tut-final{background:#fff4e0;color:#27314f;border:4px solid #27314f;box-shadow:0 6px 0 #27314f;font-weight:900}',
    '.lory-tut-hl{outline-color:#ffd23f}',
].join('');

/** @satisfies {Record<string, any>} */
const Game = {
    /** @type {LoryApp | null} */
    app: null,
    mode: 'salon',                // 'salon' | 'cut' | 'result'
    /** @type {Record<string, any>} */
    save: { v: 1, xp: 0, level: 1, boxLevel: 1, pendingBox: 0, served: 0, stars: 0, spawned: 0, seed: 1, cash: 0, tutorialDone: false, shop: null, daily: null },
    /** @type {Record<string, Function[]>} */
    _h: {},
    uiOpen: 0,
    /** @type {Set<string>} */ _wins: new Set(),
    /** @type {any} */ current: null,     // клиент в работе (стрижка, итог)
    /** @type {any} */ result: null,
    cam: { x: 900, y: 600, z: 1500, tx: 900, ty: 70, tz: 750, fov: 0.9, blend: 1, shake: 0, shakeAmp: 0 },
    _camFrom: null,
    _goal: { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, fov: 0.9 },
    dirtyHintT: 0,
    /** @type {{ available: boolean, list: any[] | null, at: number }} */
    records: { available: false, list: null, at: 0 },
    _leaving: false,
    _uiAds: false,
    _shadowKey: '',

    // --- шина событий ----------------------------------------------------------------------------

    on(type, fn) { (this._h[type] || (this._h[type] = [])).push(fn); },
    emit(type, data) {
        const list = this._h[type];
        if (!list) return;
        for (const fn of list.slice()) { try { fn(data || {}); } catch (e) { console.error('Game.emit ' + type, e); } }
    },

    // --- запуск ----------------------------------------------------------------------------------

    async init(app) {
        this.app = app;
        const view = app.location.view;
        const loaded = await Platform.load();
        if (loaded && typeof loaded === 'object') Object.assign(this.save, loaded);
        const save = this.save, persist = () => this.persist();
        Shop.init({ tabs: GAME_SHOP_TABS, items: GAME_SHOP_ITEMS, state: save.shop, persist });
        save.shop = Shop.state;
        DailyGift.init({ rewards: GAME_DAILY, rewardsSink: Shop, state: save.daily, persist });
        save.daily = DailyGift.state;
        Shop.on((e) => {
            if (e.type === 'equip' || e.type === 'unequip' || e.type === 'preview' || e.type === 'grant') this.applyLook();
            if (e.type === 'coins') this.hud();
        });

        HudLayout.init({ app });
        Input.init({ app, mouse: 'none' });
        // камерой управляет игра
        app.camera.detach();
        app.camera.update = (dt) => this.updateCamera(dt);
        view.camera.minZ = 2;

        await GameSalon.build(app);
        await GameCut.preload(view);
        GameFx.init(app);
        this.applyLook();
        this.on('ui-star', (e) => Sound.play(e.index >= 2 ? 'assets/sounds/star-3.ogg' : e.index === 1 ? 'assets/sounds/star-2.ogg' : 'assets/sounds/star-1.ogg', { volume: 0.6 }));

        if (typeof GameUI !== 'undefined' && GameUI.init) GameUI.init();
        if (Platform.name === 'playables' || /[?&]uiads\b/.test(window.location.search)) this.bindUiAds();
        this.initTutorial();
        if (save.pendingBox > save.boxLevel) GameSalon.showBox(true);
        // первый клиент уже ждёт в зале
        GameSalon.spawnCustomer(this.firstRequest(), true);
        this.snapCamera();
    },

    async ready() {
        this.emit('ready', {});
        this.emit('mode', { mode: this.mode });
        this.hud();
        Sound.music('assets/sounds/music-salon.ogg');
        Tutorial.autoStart();
        this.checkRecords();
    },

    persist() { this.save.cash = Shop.coins; Platform.save(this.save); },

    // --- прогресс --------------------------------------------------------------------------------

    xpNeed() { return GAME_XP[Math.min(this.save.level, GAME_XP.length - 1)] || 1500; },
    gearLevel() { return this.save.boxLevel || 1; },
    toolUnlocked(id) { const t = GAME_TOOLS.find(x => x.id === id); return !!t && t.level <= this.gearLevel(); },
    guardUnlocked(id) { const g = GAME_GUARDS.find(x => x.id === id); return !!g && g.level <= this.gearLevel(); },

    // Первые клиенты — с простыми заказами.
    firstRequest() {
        const n = this.save.spawned || 0;
        this.save.spawned = n + 1;
        return n === 0 ? 'bald' : n === 1 ? 'buzz3' : undefined;
    },

    hud() {
        const s = this.save;
        s.cash = Shop.coins;
        this.emit('hud', { cash: Shop.coins, xp: s.xp, xpNeed: this.xpNeed(), level: s.level });
    },

    // Что принесёт коробка уровня.
    unlocksOf(level) {
        const out = [];
        for (const t of GAME_TOOLS) if (t.level === level) out.push({ id: t.id, name: Lang.t('g.tool.' + t.id), icon: t.icon });
        for (const g of GAME_GUARDS) if (g.level === level) out.push({ id: g.id, name: Lang.t('g.unlock.' + g.id), icon: g.icon });
        if (GAME_REQUESTS.some(r => r.level === level)) out.push({ id: 'clients', name: Lang.t('g.unlock.clients'), icon: 'assets/ui/icon_star.webp' });
        return out;
    },

    addXp(n) {
        const s = this.save;
        s.xp += n;
        let up = false;
        while (s.xp >= this.xpNeed()) { s.xp -= this.xpNeed(); s.level++; up = true; }
        if (up) {
            Sound.play('assets/sounds/levelup.ogg', { volume: 0.6 });
            this.emit('levelup', { level: s.level, unlocks: this.unlocksOf(s.level) });
            this.emit('fx', { type: 'levelup' });
            if (this.unlocksOf(s.level).length || s.level > s.boxLevel) {
                s.pendingBox = s.level;
                GameSalon.showBox(true);
                this.emit('toast', { text: Lang.t('g.newbox') });
            }
        }
        return up;
    },

    // Коробку открыли: новинки доступны.
    onBoxOpened() {
        const s = this.save, from = s.boxLevel;
        s.boxLevel = Math.max(s.boxLevel, s.pendingBox || s.boxLevel);
        s.pendingBox = 0;
        let head = null;
        for (let l = from + 1; l <= s.boxLevel && !head; l++) head = this.unlocksOf(l)[0];
        Sound.play('assets/sounds/unlock.ogg', { volume: 0.6 });
        this.emit('fx', { type: 'unlock', pos: new BABYLON.Vector3(GameSalon.box.x, 60, GameSalon.box.y) });
        if (head) this.emit('unlock', { name: head.name, icon: head.icon, text: Lang.t('g.unlock.' + head.id + '.t') });
        this.persist();
        setTimeout(() => GameSalon.showBox(false), 1400);
        Tutorial.complete('box');
    },

    // Клиент сел в кресло мастера.
    onSeated(c) { Tutorial.complete('invite'); },

    onSwept(n) {
        const cash = Math.min(25, 3 + Math.round(n / 5));
        Shop.addCoins(cash);
        this.emit('cash', { delta: cash });
        this.emit('toast', { text: Lang.t('g.clean', { n: cash }) });
        Sound.play(['assets/sounds/coin-1.ogg', 'assets/sounds/coin-2.ogg', 'assets/sounds/coin-3.ogg'], { volume: 0.5 });
        this.hud();
    },

    // --- внешний вид (косметика магазина) ------------------------------------------------------------

    applyLook() {
        const look = Shop.look(), item = (id) => (id ? Shop.item(id) : null);
        const cl = item(look.clipper), cape = item(look.cape), chair = item(look.chair), skin = item(look.skin), salon = item(look.salon);
        if (cl) GameCut.skinClipper(cl.colors);
        if (cape) {
            const changed = GameSalon.capeColors.join() !== cape.colors.join() || GameSalon.capePattern !== cape.pattern;
            GameSalon.capeColors = cape.colors; GameSalon.capePattern = cape.pattern || 'stripes';
            if (changed) this.recolorCape();
        }
        if (chair) GameSalon.skinChair(chair.colors);
        if (salon) GameSalon.setTheme(salon.colors, salon.pattern);
        if (skin && GameSalon.player) GameSalon.dressPlayer(skin);
    },

    // Накидка на клиенте в кресле — в цветах выбранной в магазине.
    recolorCape() {
        const c = GameSalon.chair && GameSalon.chair.cust;
        if (!c || !c.char.cape) return;
        World3D.removeObject(GameSalon.view, c.char.cape);
        c.char.cape.dispose(); c.char.cape = null;
        c.char.setCape(true, GameSalon.capeColors, GameSalon.capePattern);
    },

    // --- рекорды -----------------------------------------------------------------------------------
    // Лидерборд площадки: счёт игрока — сумма звёзд за все стрижки. Таблица есть не на каждой площадке.

    // Есть ли у площадки таблица: если да — интерфейс показывает кнопку «Рекорды».
    async checkRecords() {
        const list = await this.loadRecords(true);
        this.records.available = list !== null;
        this.emit('records', { available: this.records.available });
    },

    // Таблица [{ rank, name, score, me, avatar? }] или null (таблицы нет). Кэш на 30 с: у площадок лимит запросов.
    async loadRecords(force) {
        const r = this.records;
        if (!force && r.list && Date.now() - r.at < 30000) return r.list;
        const list = await Platform.leaderboard({ quantityTop: 10, includeUser: true, quantityAround: 2, avatarSize: 'medium' });
        if (list) { r.list = list; r.at = Date.now(); }
        return list;
    },

    // Вход в аккаунт площадки — только по кнопке игрока. В аккаунте мог быть свой прогресс: если он больше — игра
    // перезапускается с ним, иначе текущий прогресс уходит в облако аккаунта вместе со звёздами.
    async recordsLogin() {
        const ok = await Platform.login();
        if (!ok) return false;
        let cloud = null;
        try { cloud = await Platform.load(); } catch (e) { cloud = null; }
        if (cloud && typeof cloud === 'object' && (cloud.served || 0) > (this.save.served || 0)) { window.location.reload(); return true; }
        this.persist();
        Platform.submitScore(this.save.stars || 0);
        this.records.at = 0;
        return true;
    },

    // --- реклама ---------------------------------------------------------------------------------

    // YouTube Playables (только эта сборка): межстраничная реклама по нажатию кнопок интерфейса.
    // Не во время стрижки (игровой процесс) и не поверх уже идущей рекламы; кнопки «за рекламу» её не вызывают.
    bindUiAds() {
        if (this._uiAds) return;
        this._uiAds = true;
        document.addEventListener('click', (e) => {
            const t = e.target instanceof Element ? e.target.closest('#gu button, #gu .gu-btn, #gu .gu-tab') : null;
            if (!t || t.closest('[data-rw]')) return;
            if (this.mode === 'cut' || Platform.adActive || Pause.has('platform')) return;
            Platform.interstitial();
        }, true);
    },

    // --- обучение --------------------------------------------------------------------------------

    initTutorial() {
        const waiting = () => GameSalon.customers.find(c => c.state === 'waiting') || null;
        const at = (o, h) => (o ? { x: o.x, y: o.y, h } : null);
        Tutorial.init({
            app: this.app,
            steps: [
                { id: 'walk', title: 'g.tut.walk.t', hint: 'g.tut.walk.h', icons: { touch: ['stick'] }, keys: { keyboard: ['forward', 'left', 'back', 'right'] },
                    world: () => at(waiting(), 200),
                    check: () => { const c = waiting(), p = GameSalon.player; return !!c && Math.hypot(c.x - p.x, c.y - p.y) < 150; },
                    skipIf: () => !!(GameSalon.chair && GameSalon.chair.cust) },
                { id: 'invite', title: 'g.tut.invite.t', hint: 'g.tut.invite.h', keys: { keyboard: ['interact'] }, target: { touch: '@context' },
                    world: () => at(waiting(), 200), event: 'invite', skipIf: () => !!(GameSalon.chair && GameSalon.chair.cust) },
                { id: 'start', title: 'g.tut.start.t', hint: 'g.tut.start.h', keys: { keyboard: ['interact'] }, target: { touch: '@context' },
                    world: () => at(GameSalon.chair, 215), event: 'start', skipIf: () => this.mode !== 'salon' },
                { id: 'cut', title: 'g.tut.cut.t', hint: 'g.tut.cut.h', icons: { touch: ['swipe'], keyboard: ['mouse'] },
                    check: () => Math.min(1, GameCut.stats.cut / 14) },
                { id: 'orbit', title: 'g.tut.orbit.t', hint: 'g.tut.orbit.h', icons: { touch: ['swipe'], keyboard: ['mouse'] },
                    check: () => Math.min(1, GameCut.stats.orbit / 1.6) },
                { id: 'done', title: 'g.tut.done.t', hint: 'g.tut.done.h', event: 'done', skipIf: () => this.mode !== 'cut' },
            ],
            state: () => this.save, field: 'tutorialDone', persist: () => this.persist(),
            css: GAME_TUTORIAL_CSS,
            onFinish: () => { /* игра уже в рабочем состоянии: обучение ничего не блокирует */ },
        });
    },

    howToPlay() { Tutorial.start({ replay: true }); },

    // --- интерфейс -> игра -------------------------------------------------------------------------

    // Окна интерфейса (магазин, подарок, настройки) ставят игру на паузу; учёт по именам — без «залипшей» паузы.
    uiOpened(name) { this._wins.add(name || 'win'); this.uiOpen = this._wins.size; Pause.set('manual', true); },
    uiClosed(name) { this._wins.delete(name || 'win'); this.uiOpen = this._wins.size; if (!this.uiOpen) Pause.set('manual', false); },
    cutSelectTool(id) { GameCut.selectTool(id); },
    cutSelectGuard(id) { GameCut.selectGuard(id); },
    cutRotate(dir) { GameCut.rotate(dir); },
    cutDone() { if (this.mode === 'cut') { GameCut.done(); } },
    cutCalm() { if (this.mode === 'cut') GameCut.calm(); },

    // --- стрижка ---------------------------------------------------------------------------------

    startCut(c) {
        if (this.mode !== 'salon') return;
        this.mode = 'cut'; this.current = c; c.state = 'cutting';
        Input.clearContext('salon'); Input.configure({ controls: false });
        GameSalon.player.char.setVisible(false);
        this.blendCamera(0.9);
        Platform.gameplay(true);
        Sound.music('assets/sounds/music-cut.ogg');
        GameCut.start({ cust: c, clumps: GameSalon.clumps, floorH: SALON_FLOOR_H, onFinish: (res) => this.finishCut(res) });
        const req = c.data.request;
        this.emit('mode', { mode: 'cut' });
        this.emit('cut-start', {
            name: c.data.name,
            request: { title: Lang.t('g.req.' + req.id + '.t'), text: Lang.t('g.req.' + req.id) },
            portrait: GameData.portraitNow(c.data, c.field, 'neutral'),
            target: GameData.portraitTarget(c.data, c.field),
            tools: GAME_TOOLS.map(t => ({ id: t.id, name: Lang.t('g.tool.' + t.id), icon: t.icon, locked: !this.toolUnlocked(t.id), lockText: Lang.t('g.lock.level', { n: t.level }) })),
            tool: GameCut.tool,
            guards: GAME_GUARDS.map(g => ({ id: g.id, icon: g.icon, label: Lang.t('g.guard.' + g.id), locked: !this.guardUnlocked(g.id), lockText: Lang.t('g.lock.level', { n: g.level }) })),
            guard: GameCut.guard,
        });
        this.emit('cut-tool', { tool: GameCut.tool, guard: GameCut.guard });
        Tutorial.complete('start');
    },

    finishCut(res) {
        const c = this.current, req = c.data.request, s = this.save;
        this.mode = 'result';
        const counts = Tutorial.roundCounts();          // стрижка внутри обучения раундом не считается
        Tutorial.complete('done');
        Platform.gameplay(false);
        const mult = [0.3, 0.6, 0.85, 1.15][res.stars];
        const cash = res.fled ? 0 : Math.round(req.pay * mult);
        const tip = Math.round(req.pay * ((res.clean ? 0.1 : 0) + (res.stars === 3 ? 0.15 : 0)));
        const xp = res.fled ? 1 : 5 + res.stars * 5 + Math.round(req.level * 2);
        const mood = res.stars === 3 ? 'wow' : res.stars === 2 ? 'happy' : res.stars === 1 ? 'neutral' : 'angry';
        const text = res.fled ? GameData.line('g.fled') : GameData.line('g.res' + res.stars);
        this.result = { cash, tip, xp, stars: res.stars, fled: !!res.fled };
        const ch = c.char;
        ch.setFace(res.stars >= 2 ? 'happy' : res.stars === 1 ? 'neutral' : 'angry');
        if (res.stars >= 2) ch.celebrate(1.8);
        // камера — на лицо
        GameCut.yaw = GameCut.yawGoal = GameCut.faceYaw + 0.22; GameCut.pitch = 0.1; GameCut.dist = GameCut.baseDist() * 1.2;
        this.blendCamera(0.7);
        if (res.stars === 3) { Sound.play('assets/sounds/fanfare.ogg', { volume: 0.6 }); Sound.play(['assets/sounds/voice-wow-1.ogg', 'assets/sounds/voice-wow-2.ogg'], { volume: 0.55 }); }
        else if (res.stars === 0) { Sound.play('assets/sounds/fail.ogg', { volume: 0.55 }); Sound.play(['assets/sounds/voice-angry-1.ogg', 'assets/sounds/voice-angry-2.ogg'], { volume: 0.55 }); }
        else Sound.play(['assets/sounds/voice-happy-1.ogg', 'assets/sounds/voice-happy-2.ogg', 'assets/sounds/voice-happy-3.ogg'], { volume: 0.55 });
        this.emit('fx', { type: 'result', stars: res.stars, pos: ch.headWorld().clone() });
        this.emit('mode', { mode: 'result' });
        this.emit('result', { name: c.data.name, stars: res.stars, cash, tip, xp, text, portrait: GameData.portraitNow(c.data, c.field, mood), perfect: res.stars === 3 && res.clean });
        s.served++; s.stars += res.stars;
        // рекорд — сумма звёзд за все стрижки; уходит после каждой, в том числе неудачной
        if (this.records.available || Platform.name === 'playables') Platform.submitScore(s.stars);
        this.records.at = 0;
        if (counts) Platform.ads.roundEnded(res.stars >= 1);
    },

    // Кнопка «Дальше» в итоге: расчёт, клиент уходит, мастер снова в зале.
    resultDone() {
        if (this.mode !== 'result' || this._leaving) return;
        this._leaving = true;
        // после каждых двух стрижек здесь показывается межстраничная реклама (если площадка её даёт), затем — в зал
        Platform.ads.next(() => { this._leaving = false; this.backToSalon(); });
    },

    // «x2 за рекламу» в окне итога: оплата и чаевые удваиваются один раз и только по подтверждению площадки.
    async resultDouble() {
        const r = this.result;
        if (this.mode !== 'result' || !r || r.doubled || r.busy || !(r.cash + r.tip > 0)) return false;
        r.busy = true;
        let ok = false;
        try { ok = await Platform.rewarded('pay-x2'); } catch (e) { ok = false; }
        r.busy = false;
        if (!ok || this.result !== r) return false;
        r.doubled = true; r.cash *= 2; r.tip *= 2;
        Sound.play('assets/sounds/cash.ogg', { volume: 0.5 });
        return true;
    },

    // «Монеты за рекламу» в магазине: начисление только по подтверждению площадки.
    adCashAmount() { return typeof SHOP_AD_CASH !== 'undefined' ? SHOP_AD_CASH : 80; },
    async adCash() {
        if (this._adCashBusy) return false;
        this._adCashBusy = true;
        let ok = false;
        try { ok = await Platform.rewarded('shop-cash'); } catch (e) { ok = false; }
        this._adCashBusy = false;
        if (!ok) return false;
        const n = this.adCashAmount();
        Shop.addCoins(n, { save: false });
        Sound.play('assets/sounds/cash.ogg', { volume: 0.55 });
        this.emit('cash', { delta: n });
        this.hud();
        this.persist();
        return true;
    },

    backToSalon() {
        if (this.mode !== 'result') return;
        const c = this.current, r = this.result;
        this.mode = 'salon'; this.current = null; this.result = null;
        Shop.addCoins(r.cash + r.tip, { save: false });
        Sound.play('assets/sounds/cash.ogg', { volume: 0.55 });
        this.emit('cash', { delta: r.cash + r.tip });
        this.emit('fx', { type: 'cash', pos: c.char.headWorld().clone() });
        this.addXp(r.xp);
        GameSalon.release(c);
        if (r.fled) c.speed = 330;                      // убегает, а не уходит
        this.emit('say', { name: c.data.name, text: r.fled ? GameData.line('g.fledBye') : GameData.line('g.bye'), portrait: GameData.portraitNow(c.data, c.field, 'happy') });
        GameSalon.player.char.setVisible(true);
        Input.configure({ controls: true });
        this.blendCamera(0.9);
        Sound.music('assets/sounds/music-salon.ogg');
        this.emit('mode', { mode: 'salon' });
        this.hud();
        this.persist();
        if (GameSalon.floorHair() > 14) this.dirtyHintT = 1.2;
    },

    // --- зал: взаимодействия -----------------------------------------------------------------------

    updateSalon(dt) {
        const S = GameSalon, p = S.player, ch = S.chair;
        let ctx = null;
        if (S.sweepT < 0 && !this.uiOpen) {
            const dc = Math.hypot(ch.x - p.x, ch.y - p.y);
            if (ch.cust && ch.cust.state === 'seated' && dc < 165) ctx = { id: 'cut', label: 'g.ctx.cut', icon: 'assets/ui/icon_cut.webp' };
            if (!ctx && !ch.cust) {
                let best = null, bd = 150;
                for (const c of S.customers) { if (c.state !== 'waiting') continue; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
                if (best) ctx = { id: 'invite', label: 'g.ctx.invite', icon: 'assets/ui/icon_chair.webp', c: best };
            }
            if (!ctx && S.box.active && !S.box.opening && Math.hypot(S.box.x - p.x, S.box.y - p.y) < 130) ctx = { id: 'box', label: 'g.ctx.box', icon: 'assets/ui/icon_box.webp' };
            if (!ctx && S.floorHair() >= 6 && dc < 210 && !(ch.cust && ch.cust.state === 'cutting')) ctx = { id: 'sweep', label: 'g.ctx.sweep', icon: 'assets/ui/icon_broom.webp' };
        }
        if (ctx) {
            if (this._ctxId !== ctx.id) { Input.setContext({ id: 'salon', label: ctx.label, icon: ctx.icon }); this._ctxId = ctx.id; }
            if (Input.pressed('interact')) {
                Sound.play('assets/sounds/ui-click.ogg', { volume: 0.5 });
                if (ctx.id === 'cut') this.startCut(ch.cust);
                else if (ctx.id === 'invite') S.invite(ctx.c);
                else if (ctx.id === 'box') S.openBox();
                else if (ctx.id === 'sweep') S.startSweep();
            }
        } else if (this._ctxId) { Input.clearContext('salon'); this._ctxId = null; }
        if (this.dirtyHintT > 0) { this.dirtyHintT -= dt; if (this.dirtyHintT <= 0) this.emit('toast', { text: Lang.t('g.dirty') }); }
    },

    update(dt) {
        const hub = this.mode === 'salon';
        GameSalon.update(dt, hub ? Input.move() : null, hub);
        if (hub) this.updateSalon(dt);
        if (this.mode === 'cut') GameCut.update(dt);
        if (this.current && this.mode !== 'salon') {
            // клиент в кресле живёт и во время стрижки/итога
            this.current.char.update(dt, false, 1);
            if (this.mode === 'result') GameSalon.clumps.update(dt);
        }
        GameFx.update(dt);
    },

    // --- камера ----------------------------------------------------------------------------------

    blendCamera(sec) { this._camFrom = Object.assign({}, this.cam); this.cam.blend = 0; this._blendSec = sec || 0.8; },

    shake(amp, sec) { this.cam.shakeAmp = Math.max(this.cam.shakeAmp, amp || 2); this.cam.shake = Math.max(this.cam.shake, sec || 0.25); },

    // Куда камера хочет встать в текущем режиме.
    goalPose(out) {
        if (this.mode !== 'salon' && GameCut.center) return GameCut.pose(out);
        const S = GameSalon, r = S.room, p = S.player || { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
        const cv = this.app.location.view.scene.getEngine().getRenderingCanvas();
        const aspect = cv ? cv.clientWidth / Math.max(1, cv.clientHeight) : 1.6;
        const base = typeof SALON_CAM_DIST !== 'undefined' ? SALON_CAM_DIST : 800;
        const pitch = (typeof SALON_CAM_PITCH_DEG !== 'undefined' ? SALON_CAM_PITCH_DEG : 44) * Math.PI / 180;
        const D = base * Math.max(1, 1.35 / Math.max(0.4, aspect));
        const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
        const follow = aspect < 1 ? 0.85 : 0.5;
        // на вертикальном экране камера смотрит дальше за салон: комната ниже в кадре, сверху — улица с домами
        const north = Math.max(0, 1 - aspect) * 520;
        out.tx = cx + (p.x - cx) * follow; out.ty = 70; out.tz = cy + (p.y - cy) * 0.5 - 30 - north;
        out.x = out.tx; out.y = out.ty + Math.sin(pitch) * D; out.z = out.tz + Math.cos(pitch) * D;
        out.fov = (typeof CAMERA_FOV_DEG !== 'undefined' ? CAMERA_FOV_DEG : 52) * Math.PI / 180;
        return out;
    },

    snapCamera() { this.goalPose(this.cam); this.cam.blend = 1; this.updateCamera(0); },

    updateCamera(dt) {
        const view = this.app.location.view, cam = view.camera, c = this.cam, g = this.goalPose(this._goal);
        const keys = ['x', 'y', 'z', 'tx', 'ty', 'tz', 'fov'];
        if (c.blend < 1 && this._camFrom) {
            c.blend = Math.min(1, c.blend + dt / (this._blendSec || 0.8));
            const t = c.blend, e = t * t * (3 - 2 * t), f = this._camFrom;
            for (const k of keys) c[k] = f[k] + (g[k] - f[k]) * e;
        } else {
            const k = dt > 0 ? 1 - Math.exp(-(this.mode === 'salon' ? 6 : 30) * dt) : 1;
            for (const key of keys) c[key] += (g[key] - c[key]) * k;
        }
        let sx = 0, sy = 0;
        if (c.shake > 0) { c.shake -= dt; const a = c.shakeAmp * Math.min(1, c.shake * 5); sx = (Math.random() * 2 - 1) * a; sy = (Math.random() * 2 - 1) * a; if (c.shake <= 0) c.shakeAmp = 0; }
        cam.position.set(c.x + sx, c.y + sy, c.z);
        cam.setTarget(new BABYLON.Vector3(c.tx + sx, c.ty + sy, c.tz));
        cam.fov = c.fov;
        const rr = GameSalon.room;
        GameSalon.setCloseUp(c.z < rr.y1 - 4 && c.y < rr.H - 4 && c.x > rr.x0 && c.x < rr.x1);
        // кадр теней неподвижен: по комнате в зале, по креслу при стрижке — тени не «плывут» и не мерцают
        const r = GameSalon.room, key = this.mode === 'salon' ? 'salon' : 'cut';
        if (this._shadowKey !== key) {
            this._shadowKey = key;
            if (key === 'salon') view.updateLightFrustum((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, 0, 720);
            else view.updateLightFrustum(GameSalon.chair.x, GameSalon.chair.y, 100, 300);
        }
    },
};

// Отладка (?debug в адресе): перемотка времени и жесты указателя — для проверок, когда вкладка
// в фоне и кадры идут редко. В обычной игре не используется.
if (typeof window !== 'undefined' && /[?&]debug\b/.test(window.location.search)) {
    /** @type {any} */ (window).HS_TEST = {
        // прокрутить игру на sec секунд
        ff(sec) {
            const n = Math.round(sec * 60);
            for (let i = 0; i < n; i++) { Game.app.location.update(1 / 60); Game.update(1 / 60); Tutorial.update(1 / 60); Game.updateCamera(1 / 60); }
            return Game.mode;
        },
        // сразу посадить первого клиента и открыть стрижку (reqId — нужный заказ)
        toCut(reqId) {
            const S = GameSalon;
            let c = S.chair.cust || S.customers.find(x => x.state === 'waiting');
            if (!c) c = S.spawnCustomer(reqId, true);
            if (reqId) c.data.request = GameData.request(reqId);
            if (c.state === 'waiting') S.invite(c);
            for (let i = 0; i < 900 && c.state !== 'seated'; i++) Game.update(1 / 60);
            Game.startCut(c);
            return this.ff(1.5);
        },
        // жест по канвасу: точки [u, v] в долях его размера; между точками steps шагов
        stroke(points, steps, button) {
            const cv = Game.app.location.view.scene.getEngine().getRenderingCanvas(), r = cv.getBoundingClientRect();
            const ev = (type, p) => cv.dispatchEvent(new PointerEvent(type, { clientX: r.left + p[0] * r.width, clientY: r.top + p[1] * r.height, pointerId: 7, pointerType: 'mouse', button: button || 0, bubbles: true }));
            ev('pointermove', points[0]); Game.update(1 / 60);
            ev('pointerdown', points[0]);
            for (let i = 1; i < points.length; i++) {
                const a = points[i - 1], b = points[i], n = steps || 12;
                for (let k = 1; k <= n; k++) {
                    ev('pointermove', [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
                    Game.update(1 / 60); Game.updateCamera(1 / 60);
                }
            }
            ev('pointerup', points[points.length - 1]);
            Game.update(1 / 60);
            return GameCut.active ? GameCut.field.score() : null;
        },
    };
}

// Тестовая таблица рекордов (?mocklb в адресе; ?mocklb=empty — пустая): локально у площадки таблицы нет.
if (typeof window !== 'undefined' && /[?&]mocklb\b/.test(window.location.search)) {
    const P = /** @type {any} */ (Platform);
    const empty = /[?&]mocklb=empty\b/.test(window.location.search);
    let signed = false;
    P.leaderboard = async () => {
        if (empty) return [];
        const rows = [['Мария', 412], ['Тимур', 388], ['', 301], ['Константин Константинопольский', 250], ['Zoe', 177], ['Лёва', 96]]
            .map(([name, score]) => ({ name, score, me: false }));
        if (signed) rows.push({ name: 'Рома', score: Game.save.stars || 0, me: true });
        rows.sort((a, b) => Number(b.score) - Number(a.score));
        return rows.map((r, i) => Object.assign(r, { rank: i + 1 }));
    };
    P.authorized = () => signed;
    P.canLogin = () => !signed;
    P.login = async () => { signed = true; return true; };
    P.submitScore = (v) => console.log('mock submitScore', v);
}
