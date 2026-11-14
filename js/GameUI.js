// GameUI.js — интерфейс игры «Hair Salon Master»: HUD салона и стрижки, окна (итог, уровень, инструмент,
// магазин, подарок, настройки), портреты клиентов. DOM поверх канваса, стили — GameUIStyle.js (GAME_UI_STYLE),
// тексты — ключи ui.* (GameLang.js). Игра зовёт GameUI.init() один раз; дальше интерфейс сам слушает Game.on(...).
//
// Игра -> интерфейс (Game.on): ready, mode, hud, cash, levelup, unlock, say, sweep, toast, cut-start, cut-progress,
//   cut-say, cut-tool, cut-end, result.
// Интерфейс -> игра: Game.cutSelectTool/cutSelectGuard/cutDone/cutRotate, Game.resultDone, Game.uiOpened/uiClosed,
//   Game.howToPlay, Game.emit('ui-star', { index }).

const GU_ICON = {
    cash: 'assets/ui/icon_cash.webp',
    coin: 'assets/ui/icon_coin.webp',
    star: 'assets/ui/icon_star.webp',
    trophy: 'assets/ui/icon_trophy.webp',
    starEmpty: 'assets/ui/icon_star_empty.webp',
    shop: 'assets/ui/icon_shop.webp',
    gift: 'assets/ui/icon_gift.webp',
    settings: 'assets/ui/icon_settings.webp',
    check: 'assets/ui/icon_check.webp',
    close: 'assets/ui/icon_close.webp',
    lock: 'assets/ui/icon_lock.webp',
    soundOn: 'assets/ui/icon_sound_on.webp',
    soundOff: 'assets/ui/icon_sound_off.webp',
    arrowL: 'assets/ui/icon_arrow_left.webp',
    arrowR: 'assets/ui/icon_arrow_right.webp',
    question: 'assets/ui/icon_question.webp',
    ad: 'assets/ui/icon_ad_video.webp',
    level: 'assets/ui/icon_level.webp',
    broom: 'assets/ui/icon_broom.webp',
    box: 'assets/ui/icon_box.webp',
    clipper: 'assets/ui/tool_clipper.webp',
    scissors: 'assets/ui/tool_scissors.webp',
    comb: 'assets/ui/tool_comb.webp',
    brush: 'assets/ui/tool_brush.webp',
};

/** Иконка из данных игры: id инструмента, путь assets/… или пусто (тогда символ-эмодзи выводится текстом). */
function guIconSrc(icon) {
    if (!icon) return '';
    const s = String(icon);
    if (/[\/.]/.test(s)) return s;
    return /** @type {any} */ (GU_ICON)[s] || '';
}

/** Создать элемент. */
function guEl(tag, cls, parent, text) {
    /** @type {any} */
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
}

function guImg(src, parent, cls) {
    const i = guEl('img', cls || '', parent);
    i.src = src;
    i.alt = '';
    i.draggable = false;
    return i;
}

const guT = (key, p) => Lang.t(key, p);
const guG = () => /** @type {any} */ (typeof Game !== 'undefined' ? Game : {});
const guClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const guNum = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function guShade(hex, k) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return '#555';
    const n = parseInt(m[1], 16);
    const f = (c) => Math.round(guClamp(k < 0 ? c * (1 + k) : c + (255 - c) * k, 0, 255));
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
}

/** Мини-картинка предмета магазина: preview = { shape, colors: [c1, c2, c3] }. */
function guPreviewSvg(pv) {
    const c = (pv && pv.colors) || [];
    const c1 = c[0] || '#23c4c9', c2 = c[1] || '#ffd23f', c3 = c[2] || '#ff6b6b';
    const k = 'stroke="#27314f" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
    let g = '';
    switch (pv && pv.shape) {
        case 'clipper': {
            let teeth = '';
            for (let i = 0; i < 6; i++) teeth += '<rect x="' + (35 + i * 5.6) + '" y="80" width="4" height="10" rx="1" fill="#e4e9f2" ' + k + ' stroke-width="2"/>';
            g = '<g transform="rotate(-28 50 50)"><rect x="35" y="8" width="30" height="66" rx="11" fill="' + c1 + '" ' + k + '/>' +
                '<rect x="40" y="16" width="7" height="32" rx="3.5" fill="#fff" opacity=".5"/>' +
                '<circle cx="50" cy="56" r="6.5" fill="' + c2 + '" ' + k + '/>' +
                '<rect x="31" y="70" width="38" height="12" rx="3" fill="' + c3 + '" ' + k + '/>' + teeth + '</g>';
            break;
        }
        case 'cape':
            g = '<path d="M30 20 Q50 8 70 20 L92 86 Q50 98 8 86 Z" fill="' + c1 + '" ' + k + '/>' +
                '<path d="M11 76 Q50 90 89 76 L92 86 Q50 98 8 86 Z" fill="' + c2 + '" ' + k + '/>' +
                '<path d="M30 20 Q50 34 70 20 Q50 10 30 20 Z" fill="' + c3 + '" ' + k + '/>' +
                '<circle cx="50" cy="30" r="4" fill="' + c2 + '" ' + k + '/>';
            break;
        case 'chair':
            g = '<rect x="28" y="10" width="44" height="42" rx="13" fill="' + c1 + '" ' + k + '/>' +
                '<rect x="12" y="40" width="14" height="24" rx="6" fill="' + c2 + '" ' + k + '/>' +
                '<rect x="74" y="40" width="14" height="24" rx="6" fill="' + c2 + '" ' + k + '/>' +
                '<rect x="22" y="48" width="56" height="18" rx="9" fill="' + c1 + '" ' + k + '/>' +
                '<rect x="43" y="66" width="14" height="16" fill="' + c3 + '" ' + k + '/>' +
                '<ellipse cx="50" cy="86" rx="30" ry="7" fill="' + c3 + '" ' + k + '/>';
            break;
        case 'outfit':
            g = '<path d="M32 14 L16 28 L26 42 L32 37 L32 88 L68 88 L68 37 L74 42 L84 28 L68 14 Q50 28 32 14 Z" fill="' + c1 + '" ' + k + '/>' +
                '<rect x="32" y="52" width="36" height="9" fill="' + c2 + '" stroke="#27314f" stroke-width="2"/>' +
                '<path d="M36 15 Q50 30 64 15" fill="none" stroke="' + c2 + '" stroke-width="5" stroke-linecap="round"/>' +
                '<rect x="53" y="66" width="11" height="13" rx="2" fill="' + c3 + '" ' + k + ' stroke-width="2"/>';
            break;
        case 'floor':
            for (let r = 0; r < 4; r++) {
                for (let q = 0; q < 4; q++) {
                    const x = 50 + (q - r) * 12, y = 26 + (q + r) * 7;
                    g += '<path d="M' + x + ' ' + (y - 7) + ' L' + (x + 12) + ' ' + y + ' L' + x + ' ' + (y + 7) + ' L' + (x - 12) + ' ' + y + ' Z" fill="' + ((q + r) % 2 ? c2 : c1) + '" stroke="#27314f" stroke-width="2" stroke-linejoin="round"/>';
                }
            }
            g += '<path d="M2 54 L50 82 L98 54 L98 62 L50 90 L2 62 Z" fill="' + c3 + '" ' + k + ' stroke-width="2.4"/>';
            break;
        case 'wall': {
            let st = '';
            for (let i = 0; i < 6; i++) st += '<rect x="' + (9 + i * 14) + '" y="11" width="7" height="60" fill="' + c2 + '"/>';
            g = '<rect x="8" y="10" width="84" height="76" rx="4" fill="' + c1 + '" ' + k + '/>' + st +
                '<rect x="8" y="72" width="84" height="14" fill="' + c3 + '" ' + k + '/>' +
                '<rect x="36" y="24" width="28" height="24" rx="3" fill="#fff4e0" ' + k + '/>' +
                '<circle cx="50" cy="36" r="6" fill="' + c3 + '" stroke="#27314f" stroke-width="2"/>';
            break;
        }
        default:
            g = '<rect x="16" y="16" width="68" height="68" rx="14" fill="' + c1 + '" ' + k + '/>';
    }
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + g + '</svg>';
}

/** @satisfies {Record<string, any>} */
const GameUI = {
    /** @type {any} */
    root: null,
    /** @type {Record<string, any>} */
    q: {},
    inited: false,
    /** 'none' | 'salon' | 'cut' */
    mode: 'none',
    u: 16,
    _lay: '',
    /** @type {any} */
    win: null,
    /** @type {any[]} */
    _queue: [],
    _shopTab: '',
    _cash: { shown: 0, target: 0, raf: 0 },
    /** @type {any} */
    _sayT: null,
    /** @type {any} */
    _cutSayT: null,
    /** @type {any} */
    _toastT: null,
    /** @type {any} */
    cut: null,
    _rot: 0,
    _toolN: 4,
    _lenN: 4,
    _tool: '',
    /** @type {any} */
    _curPortrait: null,
    _stars: 0,

    // =====================================================================================
    // Запуск
    // =====================================================================================

    init() {
        if (this.inited) return this;
        this.inited = true;
        const st = document.createElement('style');
        st.id = 'gu-style';
        st.textContent = GAME_UI_STYLE;
        document.head.appendChild(st);
        this._build();
        this._bindDom();
        this._bindGame();
        this.layout();
        Lang.apply(this.root);
        this.hud(this._fromGame(), false);
        this.refreshBadge();
        setInterval(() => this.refreshBadge(), 30000);
        return this;
    },

    _build() {
        const root = guEl('div', '', document.body);
        root.id = 'gu';
        this.root = root;
        const I = GU_ICON;
        root.innerHTML =
            '<div class="gu-hud" id="gu-hud">' +
            // --- салон ---
            '<div id="gu-cash" class="gu-blk gu-cash gu-salon-only"><div class="gu-cash-in"><img src="' + I.cash + '" alt=""><span class="gu-cash-v" id="gu-cash-v">0</span></div></div>' +
            '<div id="gu-level" class="gu-blk gu-level gu-salon-only"><div class="gu-lvl-in"><div class="gu-lvl-badge"><img src="' + I.level + '" alt=""><b class="gu-out" id="gu-lv-n">1</b></div>' +
            '<div class="gu-bar"><i id="gu-xp-i"></i><em id="gu-xp-t"></em></div></div></div>' +
            '<div id="gu-settings" class="gu-blk gu-salon-only"><button class="gu-set" data-act="settings" data-t-title="ui.settings"><img src="' + I.settings + '" alt=""></button></div>' +
            '<div id="gu-shop" class="gu-blk gu-salon-only"><button class="gu-side teal" data-act="shop"><img src="' + I.shop + '" alt=""><span data-t="ui.shop"></span></button></div>' +
            '<div id="gu-gift" class="gu-blk gu-salon-only"><button class="gu-side gift" data-act="gift"><img src="' + I.gift + '" alt=""><span data-t="ui.gift"></span><i class="gu-dot" id="gu-dot" hidden></i></button></div>' +
            '<div id="gu-rec" class="gu-blk gu-salon-only" hidden><button class="gu-side rec" data-act="records"><img src="' + I.trophy + '" alt=""><span data-t="ui.records"></span></button></div>' +
            '<div id="gu-hint" class="gu-blk gu-hint gu-salon-only" hidden><div class="gu-hint-in" id="gu-hint-in"></div></div>' +
            '<div id="gu-sweep" class="gu-blk gu-sweep gu-salon-only" hidden><div class="gu-sweep-in"><img src="' + I.broom + '" alt=""><div class="gu-bar"><i id="gu-sweep-i"></i></div></div></div>' +
            '<div id="gu-say" class="gu-blk gu-say gu-salon-only" hidden></div>' +
            // --- стрижка ---
            '<div id="gu-cutl" class="gu-blk gu-cutl gu-cut-only"><div class="gu-polaroid"><div class="gu-photo"><canvas id="gu-target" width="192" height="192"></canvas></div>' +
            '<div class="gu-pname" id="gu-pname"></div><div class="gu-preq" id="gu-preq"></div></div>' +
            '<div class="gu-meter" id="gu-meter"><div class="gu-mbox"><div class="gu-meter-bar"><i id="gu-mfill"></i></div>' +
            '<div class="gu-mark dim" data-th="0.55" style="bottom:55%"><img src="' + I.star + '" alt=""></div>' +
            '<div class="gu-mark dim" data-th="0.8" style="bottom:80%"><img src="' + I.star + '" alt=""></div>' +
            '<div class="gu-mark dim" data-th="0.95" style="bottom:95%"><img src="' + I.star + '" alt=""></div></div></div>' +
            '<div class="gu-clumps"><img src="' + I.broom + '" alt=""><b class="gu-out" id="gu-clumps-n">0</b></div></div>' +
            '<div id="gu-cuts" class="gu-blk gu-cut-bubble gu-cut-only" hidden></div>' +
            '<div id="gu-banner" class="gu-blk gu-cut-only" hidden><div class="gu-banner gu-out"><img src="' + I.broom + '" alt=""><span data-t="ui.brushBanner"></span></div></div>' +
            '<div id="gu-rage" class="gu-blk gu-rage gu-cut-only"><div class="gu-rage-in"><span class="gu-rage-t gu-out" data-t="ui.rage"></span><div class="gu-rage-bar"><i id="gu-rage-i"></i></div></div>' +
            '<button class="gu-btn teal gu-calm" id="gu-calm" data-act="calm" hidden><img src="' + I.ad + '" alt=""><span data-t="ui.calm"></span></button></div>' +
            '<div id="gu-lens" class="gu-blk gu-lens gu-cut-only none"></div>' +
            '<div id="gu-tools" class="gu-blk gu-tools gu-cut-only"></div>' +
            '<div id="gu-done" class="gu-blk gu-done gu-cut-only" hidden><button class="gu-btn big" data-act="done"><span data-t="ui.cutDone"></span><img src="' + I.check + '" alt=""></button></div>' +
            '<div id="gu-rotl" class="gu-blk gu-rot gu-cut-only"><button class="gu-btn teal round" data-rot="-1" data-t-title="ui.rotLeft"><img src="' + I.arrowL + '" alt=""></button></div>' +
            '<div id="gu-rotr" class="gu-blk gu-rot gu-cut-only"><button class="gu-btn teal round" data-rot="1" data-t-title="ui.rotRight"><img src="' + I.arrowR + '" alt=""></button></div>' +
            '</div>';
        const q = this.q;
        for (const e of /** @type {NodeListOf<any>} */ (root.querySelectorAll('[id]'))) q[e.id.replace(/^gu-/, '')] = e;
    },

    _bindDom() {
        const root = this.root;
        // нажатия по интерфейсу не уходят в канвас и камеру
        for (const type of ['pointerdown', 'mousedown', 'touchstart']) root.addEventListener(type, (e) => e.stopPropagation(), { passive: true });
        root.addEventListener('contextmenu', (e) => e.preventDefault());
        root.addEventListener('selectstart', (e) => e.preventDefault());
        root.addEventListener('dragstart', (e) => e.preventDefault());
        root.addEventListener('click', (e) => {
            const b = /** @type {any} */ (e.target).closest('[data-act]');
            if (!b || !root.contains(b)) return;
            const act = b.dataset.act;
            if (act === 'shop') this.openShop();
            else if (act === 'gift') this.openGift();
            else if (act === 'settings') this.openSettings();
            else if (act === 'records') this.openRecords();
            else if (act === 'calm') guG().cutCalm && guG().cutCalm();
            else if (act === 'done') guG().cutDone && guG().cutDone();
        });
        // поворот головы: держать кнопку
        for (const b of /** @type {NodeListOf<any>} */ (root.querySelectorAll('[data-rot]'))) {
            const dir = Number(b.dataset.rot);
            b.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                try { b.setPointerCapture(e.pointerId); } catch (err) { /* нет захвата */ }
                b.classList.add('on-press');
                this._setRot(dir);
            });
            const up = () => { b.classList.remove('on-press'); this._setRot(0); };
            for (const t of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) b.addEventListener(t, up);
        }
        window.addEventListener('keydown', (e) => {
            // Esc игра не использует: браузер держит его за выходом из полного экрана (требование площадок)
        });
        window.addEventListener('blur', () => this._setRot(0));
        window.addEventListener('lory-release-input', () => this._setRot(0));
        window.addEventListener('resize', () => this.layout());
        window.addEventListener('orientationchange', () => setTimeout(() => this.layout(), 200));
        window.addEventListener('lory-language', () => this.relabel());
        window.addEventListener('lory-input-context', () => this.refreshHint());
        window.addEventListener('lory-input-device', () => this.refreshHint());
        if (typeof HudLayout !== 'undefined') HudLayout.onChange(() => this.layout());
    },

    _bindGame() {
        const g = guG();
        if (typeof g.on !== 'function') { console.warn('GameUI: у Game нет шины событий on()'); return; }
        const on = (type, fn) => g.on(type, (d) => { try { fn(d || {}); } catch (e) { console.error('GameUI «' + type + '»:', e); } });
        on('ready', () => {
            if (typeof HudLayout !== 'undefined' && !HudLayout._inited) HudLayout.init({ app: /** @type {any} */ (window).app });
            this.setMode('salon');
            this.hud(this._fromGame(), false);
            this.refreshBadge();
        });
        on('mode', (d) => { if (d.mode === 'salon' || d.mode === 'cut') this.setMode(d.mode); });
        on('hud', (d) => this.hud(d, true));
        on('cash', (d) => this.cashFx(d));
        on('levelup', (d) => this.showLevelUp(d));
        on('unlock', (d) => this.showUnlock(d));
        on('say', (d) => this.say(d));
        on('sweep', (d) => this.sweep(d.progress));
        on('toast', (d) => this.toast(d.text));
        on('cut-start', (d) => this.cutStart(d));
        on('cut-progress', (d) => { this.cutProgress(d); this.rage(d); });
        on('cut-start', () => this.rage({ rage: 0 }));
        on('cut-say', (d) => this.cutSay(d));
        on('cut-tool', (d) => this.cutTool(d));
        on('cut-end', () => this.cutEnd());
        on('result', (d) => this.showResult(d));
        // у площадки есть таблица рекордов — в зале появляется кнопка «Рекорды»
        on('records', (d) => { if (this.q.rec) this.q.rec.hidden = !d.available; });
    },

    _fromGame() {
        const g = guG();
        const s = g.save || {};
        return {
            cash: typeof Shop !== 'undefined' && Shop.state ? Shop.coins : (s.cash || 0),
            xp: s.xp || 0,
            xpNeed: typeof g.xpNeed === 'function' ? g.xpNeed() : 1,
            level: s.level || 1,
        };
    },

    // =====================================================================================
    // Раскладка: единица u и блоки HudLayout
    // =====================================================================================

    layout() {
        const vp = typeof HudLayout !== 'undefined' ? HudLayout.viewport() : { W: innerWidth, H: innerHeight };
        const W = vp.W, H = vp.H;
        const mode = typeof HudLayout !== 'undefined' ? HudLayout.modeFor(W, H) : (H > W ? 'tall' : 'land');
        const tall = mode === 'tall', low = mode === 'low';
        const key = [W, H, mode, this._toolN, this._lenN, this._tool === 'clipper' ? 1 : 0].join('|');
        if (key === this._lay) return;
        this._lay = key;
        const u = guClamp(tall ? Math.min(W / 24, H / 52) : Math.min(W / 50, H / 27), 14.7, 21);
        this.u = u;
        const r = this.root;
        r.style.setProperty('--u', u + 'px');
        r.classList.toggle('gu-tall', tall);
        r.classList.toggle('gu-land', !tall);
        r.classList.toggle('gu-low', low);
        if (typeof HudLayout === 'undefined') return;
        const px = (n) => Math.round(n * u);
        const blk = (id, dock, wu, hu, extra) => HudLayout.block('gu-' + id, Object.assign({ dock, w: wu === 'auto' ? 'auto' : px(wu), h: hu === 'auto' ? 'auto' : px(hu), scale: false, el: '#gu-' + id }, extra || {}));
        // салон
        blk('cash', 'tl', 10.5, 3.2);
        blk('level', 'tc', 15, 3.4);
        blk('settings', 'tr', 3.2, 3.2);
        blk('shop', 'tl', low ? 3.4 : 3.8, low ? 3.4 : 4.5, { order: 1 });
        blk('gift', 'tl', low ? 3.4 : 3.8, low ? 3.4 : 4.5, { order: 2 });
        blk('rec', 'tl', low ? 3.4 : 3.8, low ? 3.4 : 4.5, { order: 3 });
        blk('hint', 'bc', 20, 3.2, { order: 0 });
        blk('sweep', 'bc', 14, 2.6, { order: 1 });
        blk('say', 'bc', 30, 'auto', { order: 2, fill: true, maxW: 560, minW: 260 });
        // стрижка
        blk('cutl', 'tl', 11.6, low ? 9.4 : 12);
        blk('cuts', 'tc', 26, 'auto', { fill: true, maxW: 520, minW: 300 });
        blk('banner', 'tc', 24, 'auto', { order: 1 });
        // кнопка длины: картинка-голова + подпись; в столбик (альбом) или в ряд (портрет)
        const nl = Math.max(1, this._lenN), lenLong = nl * 3.3 + (nl - 1) * 0.3;
        if (tall) blk('lens', 'bc', Math.min(W / u - 1, nl * 5.6 + (nl - 1) * 0.3), 3.3, { order: 1 });
        else blk('lens', 'mr', 7.2, lenLong, { order: 0 });
        const nt = Math.max(1, this._toolN);
        const avail = W / u - 3;
        const tw = guClamp((avail - (nt - 1) * 0.5) / nt, 3.1, 4.6);
        this.q.tools.style.setProperty('--tw', Math.round(tw * u) + 'px');
        blk('tools', 'bc', nt * tw + (nt - 1) * 0.5, low ? 3.8 : 4.9, { order: 0 });
        if (tall) blk('done', 'bc', 12, 3.2, { order: 2 }); else blk('done', 'br', 9.5, 3.2, { order: 0 });
        blk('rage', tall ? 'tc' : 'bl', 12, 5.4, { order: 3 });
        blk('rotl', 'ml', 3.4, 3.4);
        blk('rotr', 'mr', 3.4, 3.4, { order: 1 });
        HudLayout.refresh();
    },

    setMode(mode) {
        this.mode = mode;
        this.root.classList.toggle('gu-salon', mode === 'salon');
        this.root.classList.toggle('gu-cut', mode === 'cut');
        if (mode !== 'cut') this._setRot(0);
        this.refreshHint();
        if (typeof HudLayout !== 'undefined') HudLayout.refresh();
    },

    relabel() {
        Lang.apply(this.root);
        this.refreshHint();
        this.hud(this._fromGame(), false);
        if (this.cut) this.cutProgress(this.cut.last || {});
        if (this.win && this.win.render) this.win.render();
    },

    // =====================================================================================
    // HUD салона
    // =====================================================================================

    /** d: { cash, xp, xpNeed, level }; animate — плавно докрутить деньги. */
    hud(d, animate) {
        if (!this.root) return;
        if (d.cash != null) this._setCash(Number(d.cash) || 0, animate !== false);
        if (d.level != null) this.q['lv-n'].textContent = String(d.level);
        if (d.xp != null && d.xpNeed != null) {
            const need = Math.max(1, Number(d.xpNeed) || 1);
            const xp = Math.max(0, Number(d.xp) || 0);
            this.q['xp-i'].style.width = guClamp(xp / need, 0, 1) * 100 + '%';
            this.q['xp-t'].textContent = Math.floor(xp) + ' / ' + need;
        }
    },

    _paintCash() { this.q['cash-v'].textContent = guNum(this._cash.shown); },

    _setCash(v, anim) {
        const c = this._cash;
        c.target = v;
        cancelAnimationFrame(c.raf);
        if (!anim || c.shown === v || this.mode !== 'salon') { c.shown = v; this._paintCash(); return; }
        const from = c.shown, t0 = performance.now(), dur = guClamp(300 + Math.abs(v - from) * 3, 300, 900);
        if (v > from) this._jump();
        const step = (t) => {
            const k = Math.min(1, (t - t0) / dur);
            c.shown = Math.round(from + (v - from) * (1 - Math.pow(1 - k, 3)));
            this._paintCash();
            if (k < 1) c.raf = requestAnimationFrame(step); else { c.shown = v; this._paintCash(); }
        };
        c.raf = requestAnimationFrame(step);
    },

    _jump() {
        const e = this.q.cash;
        e.classList.remove('jump');
        void e.offsetWidth;
        e.classList.add('jump');
    },

    /** Всплывающее «+$90»; с x, y (px) — летит к счётчику денег. */
    cashFx(d) {
        const delta = Math.round(Number(d.delta) || 0);
        if (!delta) return;
        const f = guEl('div', 'gu-fly', this.root, delta > 0 ? guT('ui.cashDelta', { n: guNum(delta) }) : '-$' + guNum(-delta));
        const r = this.q.cash.getBoundingClientRect();
        const visible = this.mode === 'salon' && r.width > 0;
        const tx = visible ? r.left + r.width * 0.55 : innerWidth / 2, ty = visible ? r.top + r.height / 2 : 60;
        const has = isFinite(d.x) && isFinite(d.y) && d.x != null && d.y != null;
        const sx = has ? Number(d.x) : tx, sy = has ? Number(d.y) : ty + 40;
        const tr = (x, y, s) => 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(' + s + ')';
        const done = () => { f.remove(); if (visible && delta > 0) this._jump(); };
        if (typeof f.animate !== 'function') { setTimeout(done, 800); return; }
        const a = f.animate(has
            ? [{ transform: tr(sx, sy, 0.6), opacity: 0 }, { transform: tr(sx, sy - 30, 1.15), opacity: 1, offset: 0.25 }, { transform: tr(sx, sy - 30, 1.15), opacity: 1, offset: 0.45 }, { transform: tr(tx, ty, 0.6), opacity: 0.9 }]
            : [{ transform: tr(sx, sy, 0.7), opacity: 0 }, { transform: tr(sx, sy - 10, 1.1), opacity: 1, offset: 0.2 }, { transform: tr(sx, sy - 36, 1), opacity: 0 }],
        { duration: has ? 1000 : 1100, easing: 'ease-out', fill: 'forwards' });
        a.onfinish = done;
    },

    refreshBadge() {
        let n = 0;
        try { n = typeof DailyGift !== 'undefined' && DailyGift.state ? DailyGift.badge() : 0; } catch (e) { n = 0; }
        if (this.q.dot) this.q.dot.hidden = !n;
    },

    refreshHint() {
        const el = this.q.hint;
        if (!el) return;
        const ctx = typeof Input !== 'undefined' ? Input.context : null;
        const show = this.mode === 'salon' && !!ctx && !this.win && typeof Input !== 'undefined' && Input.device !== 'touch' && !Input.mouseTouch;
        el.hidden = !show;
        if (!show) return;
        const inn = this.q['hint-in'];
        inn.textContent = '';
        let key = 'E';
        try { key = Input.labelOf(Input.contextAction()) || 'E'; } catch (e) { /* по умолчанию E */ }
        guEl('kbd', '', inn, key);
        const lbl = ctx.label;
        guEl('span', '', inn, lbl && Lang.has(lbl) ? Lang.t(lbl) : (lbl || guT('ui.hintFallback')));
        if (typeof HudLayout !== 'undefined') HudLayout.schedule();
    },

    sweep(p) {
        const el = this.q.sweep;
        if (p == null || !isFinite(p)) { el.hidden = true; return; }
        el.hidden = false;
        this.q['sweep-i'].style.width = guClamp(p, 0, 1) * 100 + '%';
        if (typeof HudLayout !== 'undefined' && !el._shownOnce) { el._shownOnce = true; HudLayout.refresh(); }
    },

    toast(text) {
        if (!text) return;
        if (this._toastT) { clearTimeout(this._toastT); }
        for (const o of /** @type {NodeListOf<any>} */ (this.root.querySelectorAll('.gu-toast'))) o.remove();
        const t = guEl('div', 'gu-toast', this.root, String(text));
        this._toastT = setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, 2300);
    },

    // =====================================================================================
    // Реплики
    // =====================================================================================

    _type(el, text, cps, done) {
        el.textContent = '';
        const a = guEl('span', '', el), b = guEl('span', '', el);
        b.style.visibility = 'hidden';
        text = String(text == null ? '' : text);
        b.textContent = text;
        let i = 0;
        const id = setInterval(() => {
            i++;
            a.textContent = text.slice(0, i);
            b.textContent = text.slice(i);
            if (i >= text.length) { clearInterval(id); if (done) done(); }
        }, 1000 / cps);
        if (!text) { clearInterval(id); if (done) done(); }
        return () => clearInterval(id);
    },

    _bubble(host, d, mood, cancelKey, hideMs) {
        const old = this[cancelKey];
        if (old) { old.stopType && old.stopType(); clearTimeout(old.hideT); }
        host.hidden = false;
        host.textContent = '';
        const b = guEl('div', 'gu-bubble', host);
        b.dataset.mood = mood || 'neutral';
        const who = guEl('div', 'gu-who', b);
        const mir = guEl('div', 'gu-mirror', who);
        const cv = guEl('canvas', '', mir);
        cv.width = 160; cv.height = 160;
        this.drawPortrait(cv, Object.assign({}, d.portrait, mood ? { mood } : null));
        if (d.name) guEl('div', 'gu-name', who, String(d.name));
        const txt = guEl('div', 'gu-txt', b);
        const st = { stopType: null, hideT: 0 };
        st.stopType = this._type(txt, d.text, 38, () => {
            st.hideT = setTimeout(() => {
                b.classList.add('hide');
                st.hideT = setTimeout(() => { host.hidden = true; host.textContent = ''; }, 260);
            }, hideMs);
        });
        this[cancelKey] = st;
        if (typeof HudLayout !== 'undefined') HudLayout.refresh();
    },

    say(d) {
        this._bubble(this.q.say, d, d.portrait && d.portrait.mood, '_sayT', 3000);
    },

    cutSay(d) {
        const who = this.cut || {};
        this._bubble(this.q.cuts, { name: who.name, text: d.text, portrait: this._curPortrait }, d.mood || 'neutral', '_cutSayT', 4000);
    },

    // =====================================================================================
    // HUD стрижки
    // =====================================================================================

    cutStart(d) {
        this.cut = { name: d.name, last: { progress: 0, stars: 0, phase: 'cut', clumps: 0 }, tools: d.tools || [], guards: d.guards || [] };
        this._curPortrait = d.portrait || null;
        this._stars = 0;
        this.setMode('cut');
        this.drawPortrait(this.q.target, Object.assign({ mood: 'happy' }, d.target));
        this.q.pname.textContent = d.name || '';
        const rq = d.request || {};
        this.q.preq.textContent = '';
        if (rq.title) guEl('b', '', this.q.preq, rq.title);
        if (rq.text) this.q.preq.appendChild(document.createTextNode(rq.text));
        this.q.cutl.classList.remove('brush');
        this.q.banner.hidden = true;
        this.q.done.hidden = true;
        this.q.cuts.hidden = true;
        // инструменты
        const tools = this.q.tools;
        tools.textContent = '';
        for (const t of this.cut.tools) {
            const b = guEl('button', 'gu-tool', tools);
            b.dataset.id = t.id;
            const src = guIconSrc(t.icon) || guIconSrc(t.id);
            if (src) guImg(src, b, 't'); else guEl('i', 't', b, String(t.icon || '?'));
            // у закрытого инструмента вместо названия — с какого уровня он откроется (подписи не накладываются)
            guEl('span', '', b, t.locked && t.lockText ? t.lockText : (t.name || ''));
            if (t.locked) {
                b.classList.add('lock');
                guImg(GU_ICON.lock, b, 'lk');
            }
            b.addEventListener('click', () => {
                if (t.locked) { this.toast(t.lockText || guT('ui.lockedTool', { n: '?' })); return; }
                guG().cutSelectTool && guG().cutSelectTool(t.id);
            });
        }
        // длины
        const lens = this.q.lens;
        lens.textContent = '';
        for (const gd of this.cut.guards) {
            const b = guEl('button', 'gu-len', lens);
            b.dataset.id = gd.id;
            if (gd.icon) guImg(gd.icon, b, 'gu-len-pic');
            if (gd.locked) { b.classList.add('lock'); guImg(GU_ICON.lock, b, 'gu-len-lock'); }
            guEl('span', '', b, gd.locked && gd.lockText ? gd.lockText : (gd.label || ''));
            b.addEventListener('click', () => {
                if (gd.locked) { this.toast(gd.lockText || guT('ui.lockedLen')); return; }
                guG().cutSelectGuard && guG().cutSelectGuard(gd.id);
            });
        }
        this._toolN = this.cut.tools.length || 1;
        this._lenN = this.cut.guards.length || 1;
        this.cutTool({ tool: d.tool, guard: d.guard });
        this.cutProgress(this.cut.last);
        this._lay = '';
        this.layout();
    },

    cutTool(d) {
        this._tool = d.tool;
        for (const b of /** @type {NodeListOf<any>} */ (this.q.tools.children)) b.classList.toggle('sel', b.dataset.id === d.tool);
        for (const b of /** @type {NodeListOf<any>} */ (this.q.lens.children)) b.classList.toggle('sel', b.dataset.id === d.guard);
        const show = d.tool === 'clipper' && this._lenN > 0 && this.cut && this.cut.guards.length > 0;
        this.q.lens.classList.toggle('none', !show);
        this._lay = '';
        this.layout();
    },

    cutProgress(d) {
        if (!this.cut) return;
        this.cut.last = d;
        const p = guClamp(Number(d.progress) || 0, 0, 1), stars = d.stars | 0;
        const brush = d.phase === 'brush';
        this.q.mfill.style.height = p * 100 + '%';
        this.q.meter.classList.toggle('g1', stars === 1 || stars === 2);
        this.q.meter.classList.toggle('g3', stars >= 3);
        let i = 0;
        for (const m of /** @type {NodeListOf<any>} */ (this.q.meter.querySelectorAll('.gu-mark'))) {
            const lit = i < stars;
            m.classList.toggle('lit', lit);
            m.classList.toggle('dim', !lit);
            const img = m.firstChild;
            const want = lit ? GU_ICON.star : GU_ICON.starEmpty;
            if (img.getAttribute('src') !== want) img.setAttribute('src', want);
            i++;
        }
        const wasBrush = this.q.cutl.classList.contains('brush');
        this.q.cutl.classList.toggle('brush', brush);
        this.q.banner.hidden = !brush;
        this.q['clumps-n'].textContent = String(d.clumps | 0);
        const showDone = stars >= 1 || brush;
        this.q.done.hidden = !showDone;
        this.q.done.firstChild.classList.toggle('pulse', stars >= 3 || brush);
        if (brush !== wasBrush || (showDone && !this.q.done._seen)) { this.q.done._seen = showDone; if (typeof HudLayout !== 'undefined') HudLayout.refresh(); }
    },

    cutEnd() {
        this._setRot(0);
        for (const k of ['_cutSayT', '_sayT']) { const s = this[k]; if (s) { s.stopType && s.stopType(); clearTimeout(s.hideT); } }
        this.q.cuts.hidden = true;
        this.q.cuts.textContent = '';
        this.cut = null;
        this._tool = '';
        this.setMode('salon');
    },

    _setRot(dir) {
        if (this._rot === dir) return;
        this._rot = dir;
        const g = guG();
        if (typeof g.cutRotate === 'function') g.cutRotate(dir);
    },

    // =====================================================================================
    // Окна
    // =====================================================================================

    /**
     * Открыть окно-«талон». o: { w (в u), closable, title, coins, pause: имя для Game.uiOpened, build(win), render() }.
     * Пока открыто другое окно — ставится в очередь.
     */
    _open(o) {
        if (this.win) { this._queue.push(o); return null; }
        const ov = guEl('div', 'gu-ov', this.root);
        const wn = guEl('div', 'gu-win', ov);
        wn.style.setProperty('--w', 'calc(' + (o.w || 34) + ' * var(--u))');
        const inn = guEl('div', 'gu-in', wn);
        /** @type {any} */
        const w = { kind: o.kind, ov, wn, inn, body: null, head: null, closable: o.closable !== false, timers: [], intervals: [], render: null, o };
        if (o.title) {
            const head = guEl('div', 'gu-head', inn);
            w.head = head;
            guEl('h2', '', head).setAttribute('data-t', o.title);
            head.firstChild.textContent = guT(o.title);
            if (o.coins) {
                const c = guEl('div', 'gu-coins gu-out', head);
                guImg(GU_ICON.coin, c);
                w.coinEl = guEl('span', '', c);
            }
            if (w.closable) {
                const x = guEl('button', 'gu-x', head);
                x.setAttribute('aria-label', guT('ui.close'));
                guImg(GU_ICON.close, x);
                x.addEventListener('click', () => this.closeWindow());
            }
        } else if (w.closable) {
            const x = guEl('button', 'gu-x', wn);
            x.style.cssText = 'position:absolute;right:-.2px;top:-.2px;z-index:2';
            guImg(GU_ICON.close, x);
            x.addEventListener('click', () => this.closeWindow());
        }
        this.win = w;
        this.root.classList.add('gu-modal');
        this.refreshHint();
        if (o.pause && guG().uiOpened) guG().uiOpened(o.pause);
        if (o.build) o.build(w);
        if (w.render) w.render();
        return w;
    },

    closeWindow() {
        const w = this.win;
        if (!w || w.closing) return;
        w.closing = true;
        for (const t of w.timers) clearTimeout(t);
        for (const t of w.intervals) clearInterval(t);
        w.wn.classList.add('closing');
        this.win = null;
        if (w.o.pause && guG().uiClosed) guG().uiClosed(w.o.pause);
        setTimeout(() => {
            w.ov.remove();
            if (!this.win) {
                this.root.classList.remove('gu-modal');
                this.refreshHint();
                this.refreshBadge();
                const next = this._queue.shift();
                if (next) this._open(next);
            }
        }, 190);
        if (w.o.onClose) w.o.onClose();
    },

    _later(w, ms, fn) { w.timers.push(setTimeout(fn, ms)); },

    _unlockItem(parent, u) {
        const it = guEl('div', 'gu-unl-i', parent);
        const src = guIconSrc(u.icon);
        if (src) guImg(src, it); else if (u.icon) guEl('i', '', it, String(u.icon));
        guEl('span', '', it, u.name || '');
    },

    _confetti(parent) {
        const box = guEl('div', 'gu-conf', parent);
        const cols = ['#ff6b6b', '#ffd23f', '#23c4c9', '#3ecf6a', '#ffffff'];
        for (let i = 0; i < 22; i++) {
            const p = guEl('i', '', box);
            p.style.left = Math.random() * 100 + '%';
            p.style.background = cols[i % cols.length];
            p.style.animationDuration = 1.6 + Math.random() * 1.6 + 's';
            p.style.animationDelay = Math.random() * 0.6 + 's';
        }
    },

    showLevelUp(d) {
        this._open({
            kind: 'levelup', w: 28, closable: false,
            build: (w) => {
                const box = guEl('div', 'gu-fest', w.inn);
                this._confetti(w.inn);
                guEl('div', 'gu-rays', box);
                const bd = guEl('div', 'gu-bigbadge', box);
                guImg(GU_ICON.level, bd);
                guEl('b', 'gu-out', bd, String(d.level));
                const rt = guEl('div', 'gu-fest-r', box);
                const hd = guEl('h3', '', rt, guT('ui.levelup.title'));
                const list = d.unlocks || [];
                if (list.length) {
                    const col = guEl('div', 'gu-fest-list', rt);
                    guEl('div', 'gu-note', col, guT('ui.levelup.unlocked'));
                    const ul = guEl('div', 'gu-unl', col);
                    list.forEach((u, i) => { this._unlockItem(ul, u); ul.lastChild.style.animationDelay = 0.3 + i * 0.15 + 's'; });
                }
                const b = guEl('button', 'gu-btn big', rt);
                guEl('span', '', b, guT('ui.levelup.ok'));
                b.addEventListener('click', () => this.closeWindow());
                hd.dataset.k = 'levelup';
            },
        });
    },

    showUnlock(d) {
        this._open({
            kind: 'unlock', w: 26, closable: false,
            build: (w) => {
                const box = guEl('div', 'gu-fest', w.inn);
                this._confetti(w.inn);
                guEl('div', 'gu-rays', box);
                const big = guEl('div', 'gu-tbig', box);
                const src = guIconSrc(d.icon);
                if (src) guImg(src, big); else guEl('i', '', big, String(d.icon || '✂'));
                const rt = guEl('div', 'gu-fest-r', box);
                guEl('h3', '', rt, guT('ui.unlock.title'));
                guEl('div', 'gu-fest-name', rt, d.name || '');
                if (d.text) guEl('div', 'gu-note', rt, d.text);
                const b = guEl('button', 'gu-btn big', rt);
                guEl('span', '', b, guT('ui.unlock.ok'));
                b.addEventListener('click', () => this.closeWindow());
            },
        });
    },

    // --- итог стрижки ---
    showResult(d) {
        const stars = guClamp(d.stars | 0, 0, 3);
        this._open({
            kind: 'result', w: 36, closable: false,
            build: (w) => {
                const res = guEl('div', 'gu-res', w.inn);
                const l = guEl('div', 'gu-res-l', res);
                const mir = guEl('div', 'gu-mirror', l);
                const cv = guEl('canvas', '', mir);
                cv.width = 200; cv.height = 200;
                const mood = (d.portrait && d.portrait.mood) || (stars >= 2 ? 'happy' : stars === 1 ? 'neutral' : 'worry');
                this.drawPortrait(cv, Object.assign({}, d.portrait, { mood }));
                if (d.name) guEl('div', 'gu-res-name', l, d.name);
                if (d.text) guEl('div', 'gu-res-say', l, d.text);
                if (d.perfect) guEl('div', 'gu-perfect gu-out', w.wn, guT('ui.result.perfect'));
                const r = guEl('div', 'gu-res-r', res);
                const ttl = guEl('h3', 'gu-out', r, guT('ui.result.s' + stars));
                ttl.style.cssText = 'margin:0;font-size:1.7em;color:#ffd23f;text-align:center';
                const row = guEl('div', 'gu-stars', r);
                const sEls = [];
                for (let i = 0; i < 3; i++) {
                    const s = guEl('div', 's', row);
                    guImg(GU_ICON.starEmpty, s);
                    guImg(GU_ICON.star, s, 'on');
                    sEls.push(s);
                }
                const sum = guEl('div', 'gu-sum', r);
                const lines = [];
                const add = (icon, label, val, prefix) => {
                    if (!(val > 0)) return;
                    const ln = guEl('div', 'gu-line', sum);
                    guImg(icon, ln);
                    guEl('span', '', ln, label);
                    const b = guEl('b', '', ln, prefix + '0');
                    lines.push({ ln, b, val, prefix });
                };
                add(GU_ICON.cash, guT('ui.result.pay'), d.cash, '+$');
                add(GU_ICON.coin, guT('ui.result.tip'), d.tip, '+$');
                add(GU_ICON.star, guT('ui.result.xp'), d.xp, '+');
                const bw = guEl('div', 'gu-res-btn', r);
                // удвоение оплаты за рекламу: один раз, числа в окне обновляются после подтверждения
                if (this._ads() && (d.cash > 0 || d.tip > 0)) {
                    const x2 = guEl('button', 'gu-btn teal gu-x2', bw);
                    x2.dataset.rw = '1';
                    guImg(GU_ICON.ad, x2);
                    guEl('span', '', x2, guT('ui.result.x2'));
                    x2.addEventListener('click', async () => {
                        if (x2.classList.contains('off')) return;
                        x2.classList.add('off');
                        let ok = false;
                        try { ok = await guG().resultDouble(); } catch (e) { ok = false; }
                        if (this.win !== w) return;
                        if (!ok) { x2.classList.remove('off'); this.toast(guT('ui.adFail')); return; }
                        x2.remove();
                        for (const o of lines) if (o.prefix === '+$') { o.val *= 2; o.b.textContent = o.prefix + guNum(o.val); o.ln.classList.add('in'); }
                    });
                }
                const btn = guEl('button', 'gu-btn big', bw);
                guEl('span', '', btn, guT('ui.next'));
                btn.style.visibility = 'hidden';
                let done = false;
                btn.addEventListener('click', () => {
                    if (done) return;
                    done = true;
                    this.closeWindow();
                    guG().resultDone && guG().resultDone();
                });
                // звёзды по очереди
                for (let i = 0; i < stars; i++) {
                    this._later(w, 500 + i * 480, () => { sEls[i].classList.add('lit'); this.onStar(i); });
                }
                const t0 = 500 + Math.max(0, stars) * 480 + 150;
                lines.forEach((o, i) => this._later(w, t0 + i * 260, () => {
                    o.ln.classList.add('in');
                    const t1 = performance.now();
                    const tick = (t) => {
                        const k = Math.min(1, (t - t1) / 500);
                        o.b.textContent = o.prefix + guNum(o.val * k);
                        if (k < 1 && this.win === w) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }));
                this._later(w, t0 + lines.length * 260, () => { btn.style.visibility = ''; });
            },
        });
    },

    /** Загорелась звезда i (0..2): игра проигрывает звук. */
    onStar(i) {
        const g = guG();
        if (typeof g.emit === 'function') g.emit('ui-star', { index: i });
    },

    // --- настройки ---
    openSettings() {
        if (this.win) return;
        this._open({
            kind: 'settings', w: 26, title: 'ui.settings.title', pause: 'settings',
            build: (w) => {
                w.body = guEl('div', 'gu-body', w.inn);
                w.render = () => {
                    const body = w.body;
                    body.textContent = '';
                    const rows = guEl('div', 'gu-rows', body);
                    const snd = guEl('button', 'gu-row', rows);
                    const muted = typeof Sound !== 'undefined' && Sound.muted;
                    guImg(muted ? GU_ICON.soundOff : GU_ICON.soundOn, snd);
                    guEl('span', '', snd, guT('ui.sound'));
                    guEl('i', 'gu-sw' + (muted ? '' : ' on'), snd);
                    snd.addEventListener('click', () => { if (typeof Sound !== 'undefined') Sound.toggleMuted(); w.render(); });
                    if (typeof Platform !== 'undefined' && Platform.langSwitch) {
                        const lg = guEl('button', 'gu-row', rows);
                        guEl('span', '', lg, guT('ui.language'));
                        guEl('i', 'gu-sw' + (Lang.code === 'ru' ? ' on' : ''), lg);
                        lg.addEventListener('click', () => { Platform.setLanguage(Lang.code === 'ru' ? 'en' : 'ru'); });
                    }
                    const how = guEl('button', 'gu-row', rows);
                    guImg(GU_ICON.question, how);
                    guEl('span', '', how, guT('ui.howto'));
                    how.addEventListener('click', () => { this.closeWindow(); setTimeout(() => guG().howToPlay && guG().howToPlay(), 220); });
                };
            },
        });
    },

    // Шкала ярости клиента и кнопка «Успокоить за рекламу» (видна, когда ярость высокая и площадка даёт рекламу).
    rage(d) {
        const v = guClamp(Number(d.rage) || 0, 0, 1);
        if (this.q['rage-i']) this.q['rage-i'].style.width = Math.round(v * 100) + '%';
        if (this.q.rage) { this.q.rage.classList.toggle('hot', v >= 0.5); this.q.rage.classList.toggle('calm0', v < 0.02); }
        if (this.q.calm) this.q.calm.hidden = !d.canCalm;
    },

    // --- рекорды ---
    openRecords() {
        if (this.win) return;
        this._open({
            kind: 'records', w: 30, title: 'ui.rec.title', pause: 'records',
            build: (w) => {
                w.body = guEl('div', 'gu-body', w.inn);
                w.foot = guEl('div', 'gu-rec-foot', w.inn);
                w.state = 'loading'; w.list = null; w.busy = false;
                w.render = () => this._renderRecords(w);
                this._loadRecords(w, false);
            },
        });
    },

    async _loadRecords(w, force) {
        w.state = 'loading';
        if (this.win === w && w.body) w.render();
        let list = null;
        try { list = await guG().loadRecords(force); } catch (e) { list = null; }
        if (this.win !== w) return;
        w.list = list; w.state = list ? 'ready' : 'fail';
        w.render();
    },

    _renderRecords(w) {
        const body = w.body, g = guG();
        body.textContent = '';
        if (w.state === 'loading') guEl('div', 'gu-empty', body, guT('ui.rec.loading'));
        else if (w.state === 'fail') guEl('div', 'gu-empty', body, guT('ui.rec.fail'));
        else if (!w.list.length) guEl('div', 'gu-empty', body, guT('ui.rec.empty'));
        else {
            const tbl = guEl('div', 'gu-rec-list', body);
            for (const e of w.list) {
                const row = guEl('div', 'gu-rec-row' + (e.me ? ' me' : '') + (e.rank >= 1 && e.rank <= 3 ? ' top' + e.rank : ''), tbl);
                guEl('b', 'gu-rec-rank', row, String(e.rank));
                const av = guEl('div', 'gu-rec-av', row);
                const name = String(e.name || guT('ui.rec.anon'));
                const letter = name.charAt(0).toUpperCase();
                if (e.avatar) { const im = guImg(e.avatar, av); im.onerror = () => { im.remove(); av.textContent = letter; }; }
                else av.textContent = letter;
                const nm = guEl('span', 'gu-rec-name', row, name);
                if (e.me) guEl('i', '', nm, ' · ' + guT('ui.rec.you'));
                const sc = guEl('div', 'gu-rec-score', row);
                guImg(GU_ICON.star, sc);
                guEl('b', '', sc, guNum(e.score));
            }
        }
        // подвал: сколько звёзд у игрока и вход в аккаунт, если площадка его предлагает
        const foot = w.foot;
        foot.textContent = '';
        const mine = guEl('div', 'gu-rec-mine', foot);
        guImg(GU_ICON.star, mine);
        guEl('span', '', mine, guT('ui.rec.mine', { n: guNum((g.save && g.save.stars) || 0) }));
        if (typeof Platform !== 'undefined' && Platform.canLogin()) {
            guEl('div', 'gu-note', foot, guT('ui.rec.loginHint'));
            const b = guEl('button', 'gu-btn yellow', foot);
            guEl('span', '', b, guT('ui.rec.login'));
            b.addEventListener('click', async () => {
                if (w.busy) return;
                w.busy = true;
                let ok = false;
                try { ok = await g.recordsLogin(); } catch (e) { ok = false; }
                w.busy = false;
                if (this.win !== w) return;
                if (ok) this._loadRecords(w, true); else w.render();
            });
        }
    },

    // --- магазин ---
    openShop() {
        if (this.win || typeof Shop === 'undefined' || typeof Shop.tabs !== 'function') return;
        this._open({
            kind: 'shop', w: 46, title: 'ui.shop.title', coins: true, pause: 'shop',
            build: (w) => {
                w.tabsEl = guEl('div', 'gu-tabs', w.inn);
                this._bindTabScroll(w.tabsEl);
                // монеты за рекламу: кнопка над товарами, с общей паузой между просмотрами
                if (this._ads()) {
                    const bar = guEl('div', 'gu-adcash', w.inn);
                    const b = guEl('button', 'gu-btn teal', bar);
                    b.dataset.rw = '1';
                    guImg(GU_ICON.ad, b);
                    const lab = guEl('span', '', b, '');
                    const upd = () => {
                        const cd = Platform.rewardedCooldownLabel();
                        lab.textContent = cd || ('+$' + guNum(guG().adCashAmount()) + ' ' + guT('ui.shop.adCash'));
                        b.classList.toggle('off', !!cd);
                    };
                    upd();
                    w.intervals.push(setInterval(upd, 500));
                    b.addEventListener('click', async () => {
                        if (b.classList.contains('off')) return;
                        b.classList.add('off');
                        let ok = false;
                        try { ok = await guG().adCash(); } catch (e) { ok = false; }
                        if (this.win !== w) return;
                        if (!ok) this.toast(guT('ui.adFail'));
                        upd(); w.render();
                    });
                }
                w.body = guEl('div', 'gu-body', w.inn);
                w.busy = false;
                w.render = () => this._renderShop(w);
                w.intervals.push(setInterval(() => { if (w.anyWait) this._renderShop(w); }, 1000));
            },
        });
    },

    // Строка вкладок листается: пальцем (своя прокрутка браузера), перетаскиванием мышью и колесом.
    // После перетаскивания нажатие по вкладке не срабатывает — иначе отпускание кнопки переключало бы вкладку.
    _bindTabScroll(row) {
        /** @type {{ x: number, left: number, moved: boolean, id: number } | null} */
        let drag = null;
        let draggedAt = 0;
        row.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch' || e.button !== 0) return;
            drag = { x: e.clientX, left: row.scrollLeft, moved: false, id: e.pointerId };
        });
        row.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.id) return;
            const dx = e.clientX - drag.x;
            if (!drag.moved && Math.abs(dx) > 6) {
                drag.moved = true;
                row.classList.add('drag');
                try { row.setPointerCapture(e.pointerId); } catch (err) { /* без захвата тоже листается */ }
            }
            if (drag.moved) row.scrollLeft = drag.left - dx;
        });
        const end = () => {
            if (drag && drag.moved) draggedAt = performance.now();
            drag = null;
            row.classList.remove('drag');
        };
        row.addEventListener('pointerup', end);
        row.addEventListener('pointercancel', end);
        row.addEventListener('click', (e) => {
            if (performance.now() - draggedAt < 300) { e.stopPropagation(); e.preventDefault(); }
        }, true);
        row.addEventListener('wheel', (e) => {
            if (row.scrollWidth <= row.clientWidth + 1) return;
            row.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            e.preventDefault();
        }, { passive: false });
        row.addEventListener('scroll', () => this._tabFade(row));
    },

    // Затухание у края строки вкладок, за которым есть ещё вкладки.
    _tabFade(row) {
        const max = row.scrollWidth - row.clientWidth;
        row.classList.toggle('fl', row.scrollLeft > 2);
        row.classList.toggle('fr', max > 2 && row.scrollLeft < max - 2);
    },

    // Кнопки «за рекламу» видны только там, где площадка умеет рекламу с наградой.
    _ads() {
        try { return typeof Platform !== 'undefined' && Platform.rewardedSupported(); } catch (e) { return false; }
    },

    _renderShop(w) {
        const tabs = Shop.tabs();
        if (!tabs.some((t) => t.id === this._shopTab)) this._shopTab = tabs.length ? tabs[0].id : '';
        if (w.coinEl) w.coinEl.textContent = guNum(Shop.coins);
        const tabScroll = w.tabsEl.scrollLeft;
        w.tabsEl.textContent = '';
        for (const t of tabs) {
            const b = guEl('button', 'gu-tab' + (t.id === this._shopTab ? ' sel' : ''), w.tabsEl);
            if (t.data && t.data.icon) guImg(t.data.icon, b, 'gu-tab-pic');
            guEl('span', '', b, t.name);
            b.addEventListener('click', () => { this._shopTab = t.id; w.body.scrollTop = 0; this._renderShop(w); });
        }
        // строка вкладок пересобрана: вернуть прокрутку и держать выбранную вкладку на виду
        const row = w.tabsEl, sel = /** @type {HTMLElement | null} */ (row.querySelector('.gu-tab.sel'));
        row.scrollLeft = tabScroll;
        if (sel) {
            const pad = 12, l = sel.offsetLeft - row.offsetLeft, r = l + sel.offsetWidth;
            if (l - pad < row.scrollLeft) row.scrollLeft = Math.max(0, l - pad);
            else if (r + pad > row.scrollLeft + row.clientWidth) row.scrollLeft = r + pad - row.clientWidth;
        }
        this._tabFade(row);
        const keep = w.body.scrollTop;
        w.body.textContent = '';
        const cards = Shop.cards(this._shopTab) || [];
        if (!cards.length) guEl('div', 'gu-empty', w.body, guT('ui.shop.empty'));
        const grid = guEl('div', 'gu-grid', w.body);
        w.anyWait = false;
        const ads = this._ads();
        for (const c of cards) {
            if (c.adWait) w.anyWait = true;
            const el = guEl('div', 'gu-card' + (c.rarity ? ' r-' + c.rarity : '') + (c.equipped ? ' eq' : ''), grid);
            const pv = guEl('div', 'gu-pv', el);
            const pvw = c.item && c.item.preview;
            if (pvw && pvw.shape === 'portrait' && pvw.portrait) {
                // скин мастера — портрет в цветах формы
                pv.style.background = 'linear-gradient(180deg, ' + (pvw.colors[0] || '#fff4e0') + ' 0 58%, ' + (pvw.colors[1] || '#23c4c9') + ' 58% 100%)';
                const cvs = /** @type {HTMLCanvasElement} */ (guEl('canvas', 'gu-pv-face', pv));
                cvs.width = 160; cvs.height = 160; cvs.style.width = '100%'; cvs.style.height = '100%';
                this.drawPortrait(cvs, pvw.portrait);
            } else pv.innerHTML = guPreviewSvg(pvw);
            if (c.rarityLabel && c.rarity && c.rarity !== 'common') guEl('span', 'gu-rar', pv, c.rarityLabel);
            if (c.owned) guImg(GU_ICON.check, pv, 'gu-tick');
            guEl('div', 'gu-cname', el, c.name);
            const pr = guEl('div', 'gu-price', el);
            if (c.owned) { /* подпись «Куплено / Надето» */ }
            else if (c.kind === 'coins') guImg(GU_ICON.coin, pr);
            else if (c.kind === 'ads') guImg(GU_ICON.ad, pr);
            else guImg(GU_ICON.lock, pr);
            guEl('span', '', pr, c.priceLabel);
            const hideAd = c.action === 'watch' && !ads;
            if (c.action === 'none' || hideAd) {
                const lr = guEl('div', 'gu-lockrow', el);
                guEl('span', '', lr, hideAd ? guT('ui.shop.adNone') : (c.hint || ''));
                continue;
            }
            const b = guEl('button', 'gu-btn ' + (c.action === 'buy' ? 'yellow' : c.action === 'watch' ? 'teal' : c.action === 'unequip' ? 'cream' : ''), el);
            if (c.action === 'watch') { guImg(GU_ICON.ad, b); b.dataset.rw = '1'; }
            guEl('span', '', b, c.actionLabel);
            if (!c.enabled) b.classList.add('off');
            b.addEventListener('click', async () => {
                if (w.busy) return;
                if (!c.enabled) { if (c.hint) this.toast(c.hint); return; }
                w.busy = true;
                let r = null;
                try { r = await Shop.act(c.id); } catch (e) { r = { ok: false }; }
                w.busy = false;
                if (this.win !== w) return;
                if (r && r.ok === false && r.reason && /^(adFailed|adUnavailable|cooldown)$/.test(r.reason)) this.toast(Shop.t('shop.adUnavailable'));
                this._renderShop(w);
                this.hud(this._fromGame(), true);
            });
        }
        w.body.scrollTop = keep;
    },

    // --- подарок дня ---
    openGift() {
        if (this.win || typeof DailyGift === 'undefined' || !DailyGift.view) return;
        this._open({
            kind: 'gift', w: 34, title: 'ui.gift.title', pause: 'gift',
            build: (w) => {
                w.body = guEl('div', 'gu-body', w.inn);
                w.foot = guEl('div', 'gu-foot', w.inn);
                w.got = '';
                w.busy = false;
                w.render = () => this._renderGift(w);
                w.intervals.push(setInterval(() => { if (!DailyGift.canClaim() || DailyGift.view().x2.adWait) this._renderGift(w); else this._renderGift(w); }, 1000));
            },
        });
    },

    _gotText(r) {
        const parts = [];
        for (const g of r.got || []) {
            if (g.type === 'coins') parts.push(DailyGift.t('reward.coins', { n: g.amount }));
            else parts.push(DailyGift.itemName(g.id));
        }
        return parts.join(', ');
    },

    _renderGift(w) {
        const v = DailyGift.view();
        const keep = w.body.scrollTop;
        w.body.textContent = '';
        const grid = guEl('div', 'gu-days', w.body);
        for (const d of v.days) {
            const el = guEl('div', 'gu-day ' + d.state + (d.exclusive ? ' d7' : ''), grid);
            guEl('div', 'dn', el, d.dayLabel);
            const di = guEl('div', 'di', el);
            const r = d.reward || {};
            guImg(r.exclusive ? GU_ICON.star : (r.item || r.randomItems) && !r.coins ? GU_ICON.gift : r.coins ? GU_ICON.coin : GU_ICON.gift, di);
            guEl('div', 'dl', el, d.label);
            if (d.stateLabel) guEl('div', 'ds', el, d.stateLabel);
            if (d.state === 'claimed') guImg(GU_ICON.check, el, 'ck');
        }
        if (w.got) guEl('div', 'gu-gotbox', w.body, guT('ui.gift.got', { s: w.got }));
        w.body.scrollTop = keep;
        const f = w.foot;
        f.textContent = '';
        if (v.canClaim) {
            const b = guEl('button', 'gu-btn big' + (v.claim.enabled ? '' : ' off'), f);
            guEl('span', '', b, v.claim.label);
            b.style.animation = 'guPulse 1s ease-in-out infinite';
            b.addEventListener('click', () => {
                if (w.busy) return;
                const r = DailyGift.claim();
                if (r && r.ok) { w.got = this._gotText(r); this.hud(this._fromGame(), true); this._renderGift(w); this.refreshBadge(); } else this.toast(guT('ui.gift.fail'));
            });
            if (v.x2.available && this._ads()) {
                const x = guEl('button', 'gu-btn teal' + (v.x2.enabled ? '' : ' off'), f);
                guImg(GU_ICON.ad, x); x.dataset.rw = '1';
                guEl('span', '', x, v.x2.label + (v.x2.rewardLabel && v.x2.enabled ? '' : ''));
                x.addEventListener('click', async () => {
                    if (w.busy) return;
                    if (!v.x2.enabled) { if (v.x2.hint) this.toast(v.x2.hint); return; }
                    w.busy = true;
                    let r = null;
                    try { r = await DailyGift.claimX2(); } catch (e) { r = { ok: false }; }
                    w.busy = false;
                    if (this.win !== w) return;
                    if (r && r.ok) { w.got = this._gotText(r); this.hud(this._fromGame(), true); this._renderGift(w); this.refreshBadge(); } else if (r && r.reason !== 'claimed') this.toast(v.x2.hint || guT('ui.gift.fail'));
                });
                if (v.x2.hint) guEl('div', 'gu-note', f, v.x2.hint);
            }
        } else {
            guEl('div', 'gu-note', f, v.nextLabel || guT('ui.gift.nextShort'));
        }
    },

    // =====================================================================================
    // Портрет клиента
    // =====================================================================================

    /**
     * Голова анфас в 2D-канвасе. p: { skin, hair, mood, shirt, len: { top, front, side, back, beard } }; длины 0..0.7
     * (0 — лысо, ~0.04 — ёжик точками, 0.1–0.2 коротко, 0.4+ пышно).
     */
    drawPortrait(canvas, p) {
        if (!canvas || !canvas.getContext) return;
        p = p || {};
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const INK = '#27314f';
        const skin = p.skin || '#ffd9b0', hair = p.hair || '#6b3f1d', mood = p.mood || 'happy';
        const L = Object.assign({ top: 0.2, front: 0.1, side: 0.15, back: 0.1, beard: 0 }, p.len);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(canvas.width / 100, canvas.height / 100);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const hx = 25, hy = 24, hw = 50, hh = 58, cx = 50;
        const real = (v) => v >= 0.08;
        const stub = (v) => v >= 0.015 && v < 0.08;
        const tt = (v) => guClamp((v - 0.08) / 0.62, 0, 1);
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const stroke = (w) => { ctx.lineWidth = w == null ? 2 : w; ctx.strokeStyle = INK; ctx.stroke(); };
        const fillStroke = (col, w) => { ctx.fillStyle = col; ctx.fill(); stroke(w); };
        const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
        const dots = (x0, y0, x1, y1, n, clip) => {
            ctx.save();
            if (clip) clip();
            ctx.fillStyle = hair;
            for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 0.75, 0, 7); ctx.fill(); }
            ctx.restore();
        };
        const headClip = () => { rr(hx, hy, hw, hh, 18); ctx.clip(); };

        // длинные волосы сзади
        if (real(L.back)) {
            const t = tt(L.back);
            rr(hx - 3 - 5 * t, 28, hw + 6 + 10 * t, 36 + 40 * t, 16);
            fillStroke(guShade(hair, -0.2));
        }
        // плечи и шея
        rr(14, 88, 72, 30, 14); fillStroke(p.shirt || '#2f6fd6');
        rr(41, 76, 18, 16, 5); fillStroke(guShade(skin, -0.12));
        // уши
        for (const sx of [hx - 1, hx + hw + 1]) { ctx.beginPath(); ctx.ellipse(sx, 56, 4.5, 6.5, 0, 0, 7); fillStroke(skin); }
        // голова
        rr(hx, hy, hw, hh, 18); fillStroke(skin, 2.4);
        if (mood === 'angry') { rr(hx, hy, hw, hh, 18); ctx.fillStyle = 'rgba(255,60,60,.22)'; ctx.fill(); }
        // борода
        const bt = tt(L.beard);
        if (real(L.beard)) {
            ctx.beginPath();
            ctx.moveTo(hx + 1, 50);
            ctx.bezierCurveTo(hx - 1, 72, hx + 8, hy + hh + 4 + 12 * bt, cx, hy + hh + 4 + 12 * bt);
            ctx.bezierCurveTo(hx + hw - 8, hy + hh + 4 + 12 * bt, hx + hw + 1, 72, hx + hw - 1, 50);
            ctx.quadraticCurveTo(hx + hw - 4, 60, hx + hw - 11, 61);
            ctx.quadraticCurveTo(cx, 57, hx + 11, 61);
            ctx.quadraticCurveTo(hx + 4, 60, hx + 1, 50);
            ctx.closePath();
            fillStroke(hair);
            ctx.beginPath(); ctx.ellipse(cx, 68.5, 9, 5.5, 0, 0, 7); ctx.fillStyle = skin; ctx.fill();
        } else if (stub(L.beard)) {
            dots(hx, 56, hx + hw, hy + hh, 150, () => { headClip(); ctx.beginPath(); ctx.rect(0, 58, 100, 40); ctx.rect(0, 0, 0, 0); ctx.clip(); });
        }
        // лицо
        ctx.fillStyle = 'rgba(255,107,107,.5)';
        for (const sx of [31, 69]) { ctx.beginPath(); ctx.ellipse(sx, 64, 5, 3, 0, 0, 7); ctx.fill(); }
        const eyeRx = mood === 'wow' ? 4.4 : 3.6, eyeRy = mood === 'wow' ? 6.4 : 5;
        for (const sx of [38, 62]) {
            ctx.beginPath(); ctx.ellipse(sx, 55, eyeRx, eyeRy, 0, 0, 7);
            if (mood === 'wow') { ctx.fillStyle = '#fff'; ctx.fill(); stroke(1.6); ctx.beginPath(); ctx.ellipse(sx, 55, 2.6, 3.4, 0, 0, 7); }
            ctx.fillStyle = INK; ctx.fill();
            ctx.beginPath(); ctx.arc(sx - 1.1, 53.2, 1.2, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
        }
        // брови
        ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
        const brow = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
        if (mood === 'worry') { brow(29, 48, 44, 43.5); brow(71, 48, 56, 43.5); }
        else if (mood === 'angry') { brow(29, 43, 44, 48.5); brow(71, 43, 56, 48.5); }
        else if (mood === 'wow') { brow(30, 42, 44, 41); brow(70, 42, 56, 41); }
        else { brow(30, 46, 44, 45); brow(70, 46, 56, 45); }
        // нос
        ctx.beginPath(); ctx.moveTo(48, 62); ctx.quadraticCurveTo(50, 64, 52, 62); stroke(1.4);
        // рот
        if (mood === 'happy') {
            ctx.beginPath(); ctx.moveTo(41, 67); ctx.quadraticCurveTo(50, 80, 59, 67); ctx.closePath(); ctx.fillStyle = '#8a2c3c'; ctx.fill(); stroke(1.8);
            ctx.beginPath(); ctx.moveTo(43, 67.8); ctx.quadraticCurveTo(50, 70.5, 57, 67.8); ctx.lineTo(56, 70); ctx.quadraticCurveTo(50, 72, 44, 70); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
        } else if (mood === 'wow') {
            ctx.beginPath(); ctx.ellipse(50, 71, 4.5, 5.5, 0, 0, 7); ctx.fillStyle = '#8a2c3c'; ctx.fill(); stroke(1.8);
        } else if (mood === 'worry') {
            ctx.beginPath(); ctx.moveTo(43, 71); ctx.quadraticCurveTo(46.5, 68, 50, 71); ctx.quadraticCurveTo(53.5, 74, 57, 71); stroke(2);
            ctx.beginPath(); ctx.moveTo(79, 38); ctx.quadraticCurveTo(83, 45, 79, 48); ctx.quadraticCurveTo(75, 45, 79, 38); ctx.fillStyle = '#7fd6ff'; ctx.fill(); stroke(1.4);
        } else if (mood === 'angry') {
            ctx.beginPath(); ctx.moveTo(43, 73); ctx.quadraticCurveTo(50, 66, 57, 73); stroke(2.2);
        } else {
            ctx.beginPath(); ctx.moveTo(44, 69); ctx.quadraticCurveTo(50, 72, 56, 69); stroke(2);
        }
        // боковые волосы
        const side = (sx, dir) => {
            if (real(L.side)) {
                const t = tt(L.side);
                const w = 7 + 6 * t, x0 = dir < 0 ? hx - 3 - 5 * t : hx + hw - 4 + 0;
                rr(x0, 34, w + 3 * t, 16 + 34 * t, 5); fillStroke(hair);
            }
        };
        side(0, -1); side(0, 1);
        if (stub(L.side)) dots(hx, 34, hx + 7, 62, 40, headClip), dots(hx + hw - 7, 34, hx + hw, 62, 40, headClip);
        // верхняя шапка
        if (real(L.top)) {
            const t = tt(L.top), H = 4 + 20 * t;
            ctx.beginPath();
            ctx.moveTo(hx - 2 - 3 * t, 46);
            ctx.bezierCurveTo(hx - 5 - 5 * t, hy - H * 0.95, hx + hw + 5 + 5 * t, hy - H * 0.95, hx + hw + 2 + 3 * t, 46);
            ctx.quadraticCurveTo(hx + hw - 2, 36, cx + 10, 33);
            ctx.quadraticCurveTo(cx, 29, cx - 10, 33);
            ctx.quadraticCurveTo(hx + 2, 36, hx - 2 - 3 * t, 46);
            ctx.closePath();
            fillStroke(hair);
            ctx.strokeStyle = guShade(hair, 0.35); ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(cx - 14, hy - H * 0.55); ctx.quadraticCurveTo(cx, hy - H * 0.75, cx + 12, hy - H * 0.5); ctx.stroke();
        } else if (stub(L.top)) dots(hx + 2, hy - 1, hx + hw - 2, 36, 120, headClip);
        // чёлка
        if (real(L.front)) {
            const t = tt(L.front), yb = 36 + 14 * t, n = 5, wd = (hw + 2) / n;
            ctx.beginPath();
            ctx.moveTo(hx - 1, 30); ctx.lineTo(hx - 1, yb - 2);
            for (let i = 0; i < n; i++) { const x0 = hx - 1 + i * wd; ctx.quadraticCurveTo(x0 + wd / 2, yb + 5 + (i % 2) * 3, x0 + wd, yb - 2); }
            ctx.lineTo(hx + hw + 1, 30); ctx.closePath();
            fillStroke(hair);
        } else if (stub(L.front)) dots(hx + 3, 28, hx + hw - 3, 38, 70, headClip);
        // блик на лысине
        if (L.top < 0.015 && L.front < 0.015) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(40, 31, 5, 2.4, -0.5, 0, 7); ctx.fill(); }
        ctx.restore();
    },
};
