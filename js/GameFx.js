// GameFx.js — визуальные эффекты игры и перекраска моделей (косметика магазина).
// Эффекты подписываются на события игры: Game.on('fx', e) — e.type: cut | snip | brush | oops | star |
// cash | levelup | sweep | sit | unlock | result; e.pos — мировая точка Babylon (если есть).
// Частицы — app.fx (ParticleFX): бюджет FX_MAX_*, пауза и очистка — в нём.

// Спрайты частиц (пути литералами — их видит сканер сборщика).
const FX_TEX = {
    star: 'assets/fx/star_5pt.webp', sparkle: 'assets/fx/sparkle_big.webp', sparkle4: 'assets/fx/sparkle_4pt.webp',
    flare: 'assets/fx/flare_gold.webp', coinSpark: 'assets/fx/coin_sparkle.webp', coin: 'assets/fx/coin.webp',
    confetti: 'assets/fx/confetti_color.webp', conf1: 'assets/fx/confetti_01.webp', conf2: 'assets/fx/confetti_02.webp', conf3: 'assets/fx/confetti_03.webp',
    ring: 'assets/fx/ring_glow.webp', dust: 'assets/fx/dust_puff.webp', soft: 'assets/fx/soft_circle.webp',
    flash: 'assets/fx/flash_star.webp', streak: 'assets/fx/spark_streak.webp', smoke: 'assets/fx/smoke_puff.webp',
    hair: 'assets/fx/hair_strand.webp',
};

// Настройки эффектов (px мира). Общий бюджет частиц — FX_MAX_* движка (на телефоне вдвое меньше).
const FX_CFG = {
    cutGap: 0.07,        // с: не чаще одного всплеска волос
    cutMaxBurst: 7,      // волосинок за всплеск
    liveCap: 30,         // выше этого числа живых систем мелкие эффекты (cut, brush, sweep) пропускаются
    mote: { rate: 5, life: [4, 7], size: [4, 7], alpha: 0.4 },
    pinRate: 7,
};

/** @satisfies {Record<string, any>} */
const GameFx = {
    /** @type {LoryApp | null} */
    app: null,
    t: 0, cutT: 0, cutN: 0, oopsT: 0, sparkT: 0, _pinI: 0,
    /** @type {any} */ cutPos: null,
    /** @type {any} */ motes: null,
    /** @type {any} */ pinFx: null,

    init(app) {
        this.app = app;
        // Текстуры — заранее: иначе первый всплеск ждёт загрузки и может пропасть.
        if (app.fx) for (const url of Object.values(FX_TEX)) app.fx.texture(url);
        Game.on('fx', (e) => this.onFx(e));
        Game.on('mode', () => this.syncAmbient());
    },

    fx() { return this.app && this.app.fx; },

    // Точка p, сдвинутая к камере на d px: эффект рядом с головой не прячется за самой головой и волосами.
    toCam(p, d) {
        const cam = this.app && this.app.location && this.app.location.view.scene.activeCamera;
        if (!cam) return p;
        const v = cam.position.subtract(p), l = v.length();
        return l > 1 ? p.add(v.scale(d / l)) : p;
    },

    // Слои эффекта (описания ParticleFX) в точке; soft — необязательный эффект: при забитом бюджете пропускается.
    spawn(layers, pos, soft) {
        const fx = this.fx();
        if (!fx || !pos) return;
        if (soft && fx.effects.size > FX_CFG.liveCap) return;
        for (const l of layers) fx.create({ ...l, position: pos });
    },

    onFx(e) {
        if (!this.fx()) return;
        const T = FX_TEX, P = (v) => new BABYLON.Vector3(v.x, v.y, v.z);
        const head = () => (typeof GameCut !== 'undefined' && GameCut.cust && GameCut.cust.char) ? P(GameCut.cust.char.headWorld()) : null;
        switch (e.type) {
            case 'cut': this.cutN += e.n || 1; this.cutPos = e.pos ? P(e.pos) : null; this.flushCut(); break;
            case 'snip': {
                const p = this.toCam(P(e.pos), 6);
                this.spawn([
                    { texture: T.streak, burst: 6, capacity: 8, life: [0.12, 0.26], size: [2.5, 5], speed: [12, 28], color: '#ffd23f', color2: '#ffffff', spin: [-3, 3], sizeGradient: [[0, 1], [1, 0.2]] },
                    { texture: T.sparkle4, burst: 1, capacity: 2, life: [0.14, 0.2], size: [5, 8], speed: [0, 2], color: '#ffffff', sizeGradient: [[0, 0.3], [0.35, 1], [1, 0]] },
                ], p, true);
                break;
            }
            case 'brush': {
                const p = P(e.pos), n = Math.min(6, 1 + (e.n || 1));
                this.spawn([
                    { texture: T.dust, burst: n, capacity: 8, life: [0.5, 0.9], size: [6, 11], speed: [4, 14], color: '#e8dcc9', alpha: 0.6, blend: 'standard',
                      direction: [[-0.6, 0.1, -0.6], [0.6, 0.8, 0.6]], gravity: [0, 6, 0], sizeGradient: [[0, 0.5], [1, 1.6]], spin: [-1, 1] },
                    { texture: T.soft, burst: Math.ceil(n / 2), capacity: 5, life: [0.4, 0.8], size: [1.5, 2.6], speed: [6, 18], color: '#fff6e6', alpha: 0.7, gravity: [0, 8, 0] },
                ], p, true);
                break;
            }
            case 'oops': {
                if (this.t < this.oopsT) break;
                this.oopsT = this.t + 0.3;
                const p = this.toCam(P(e.pos), 8);
                this.spawn([
                    { texture: T.soft, burst: 2, capacity: 3, life: [0.22, 0.32], size: [14, 20], speed: [0, 1], color: '#ff3030', alpha: 0.85, sizeGradient: [[0, 0.4], [0.3, 1], [1, 1.5]] },
                    { texture: T.flash, burst: 1, capacity: 2, life: [0.25, 0.3], size: [14, 20], speed: [0, 1], color: '#ff6a5c', sizeGradient: [[0, 0.3], [0.3, 1], [1, 0.6]], spin: [-2, 2] },
                    { texture: T.streak, burst: 7, capacity: 8, life: [0.2, 0.4], size: [3, 5], speed: [14, 34], color: '#ff4a3a', color2: '#ff9a8a', blend: 'standard', spin: [-4, 4] },
                ], p);
                Game.shake(1.6, 0.18);
                break;
            }
            case 'star': {
                const h = head(); if (!h) break;
                const n = Math.max(1, Math.min(3, e.n || 1));
                h.y += 12;
                this.spawn([
                    { texture: T.star, burst: 4 + n * 3, capacity: 14, life: [0.8, 1.3], size: [6, 9], speed: [10, 26], color: '#ffc21f', color2: '#ffe066', blend: 'standard', spin: [-3, 3],
                      box: [[-14, 0, 0], [14, 10, 0]], direction: [[-1, 0.3, 0.2], [1, 1.2, 0.5]], gravity: [0, -26, 0], sizeGradient: [[0, 0.3], [0.2, 1], [0.8, 0.9], [1, 0]] },
                    { texture: T.sparkle, burst: 3 + n * 2, capacity: 10, life: [0.5, 0.9], size: [5, 9], speed: [8, 24], color: '#ffd23f', color2: '#ff9fd0', blend: 'standard', spin: [-2, 2],
                      box: [[-16, 0, 0], [16, 12, 0]], direction: [[-1, 0.2, 0.2], [1, 1.2, 0.5]], sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] },
                    { texture: T.ring, burst: 1, capacity: 1, life: [0.45, 0.45], size: [14, 14], speed: [0, 0], color: '#ffd23f', alpha: 0.9, sizeGradient: [[0, 0.3], [1, 3]] },
                ], this.toCam(h, 40));
                break;
            }
            case 'sit': {
                const p = P(e.pos); p.y = SALON_FLOOR_H + 3; p.z += 6;
                this.spawn([
                    { texture: T.dust, burst: 7, capacity: 8, life: [0.5, 0.9], size: [34, 52], speed: [26, 60], color: '#cdb99c', alpha: 0.6, blend: 'standard',
                      direction: [[-1, 0.05, -1], [1, 0.3, 1]], sizeGradient: [[0, 0.5], [1, 1.7]], spin: [-1, 1] },
                ], p);
                break;
            }
            case 'sweep': {
                const p = P(e.pos); p.y = SALON_FLOOR_H + 2;
                this.spawn([
                    { texture: T.dust, burst: 4, capacity: 5, life: [0.5, 0.9], size: [24, 40], speed: [20, 48], color: '#c9b595', alpha: 0.55, blend: 'standard',
                      box: [[-18, 0, -18], [18, 2, 18]], direction: [[-1, 0.05, -1], [1, 0.4, 1]], sizeGradient: [[0, 0.5], [1, 1.5]], spin: [-1, 1] },
                    { texture: T.soft, burst: 3, capacity: 4, life: [0.5, 1], size: [6, 10], speed: [14, 40], color: '#b59c78', alpha: 0.7, blend: 'standard', gravity: [0, 18, 0], box: [[-18, 0, -18], [18, 4, 18]] },
                ], p, true);
                break;
            }
            case 'result': {
                const p0 = e.pos ? P(e.pos) : head(); if (!p0) break;
                const p = this.toCam(p0, 36), st = e.stars | 0;
                if (st >= 3) {
                    p.y += 18;
                    const conf = (tex, color, color2) => ({ texture: tex, burst: 10, capacity: 12, life: [1.1, 1.8], size: [5, 8], speed: [10, 30], color, color2, blend: 'standard', spin: [-5, 5], colorGradient: [[0, color, 1], [0.7, color, 1], [1, color, 0]],
                        direction: [[-1, 0.4, -0.3], [1, 1.2, 0.3]], gravity: [0, -30, 0], box: [[-20, 0, -4], [20, 6, 4]], sizeGradient: [[0, 1], [0.8, 1], [1, 0.4]] });
                    this.spawn([
                        conf(T.confetti, '#ffffff', '#ffffff'), conf(T.conf1, '#ff5d8f', '#ffd23f'), conf(T.conf2, '#4ecdc4', '#7ab8ff'), conf(T.conf3, '#ffd23f', '#ff9f43'),
                        { texture: T.sparkle, burst: 14, capacity: 16, life: [0.6, 1.2], size: [5, 9], speed: [8, 24], color: '#ffd23f', color2: '#ff9fd0', blend: 'standard', spin: [-2, 2],
                          box: [[-24, -8, -4], [24, 14, 4]], direction: [[-1, -0.2, -0.5], [1, 1, 0.5]], sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] },
                        { texture: T.ring, burst: 1, capacity: 1, life: [0.6, 0.6], size: [14, 14], speed: [0, 0], color: '#ffd23f', alpha: 0.8, sizeGradient: [[0, 0.3], [1, 3.6]] },
                    ], p);
                } else if (st === 2) {
                    p.y += 20;
                    this.spawn([
                        { texture: T.sparkle, burst: 10, capacity: 12, life: [0.6, 1.1], size: [5, 9], speed: [8, 26], color: '#ffd23f', color2: '#ffe9a0', blend: 'standard', spin: [-2, 2],
                          box: [[-22, -8, -4], [22, 12, 4]], direction: [[-1, -0.2, -0.5], [1, 1, 0.5]], sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] },
                        { texture: T.flare, burst: 3, capacity: 4, life: [0.5, 0.8], size: [10, 16], speed: [0, 4], color: '#ffc400', alpha: 0.7, blend: 'standard', sizeGradient: [[0, 0.3], [0.3, 1], [1, 0]] },
                    ], p);
                } else if (st === 1) {
                    p.y += 18;
                    this.spawn([
                        { texture: T.sparkle4, burst: 5, capacity: 6, life: [0.5, 0.9], size: [4, 7], speed: [6, 18], color: '#ffd23f', color2: '#ffe9a0', blend: 'standard', box: [[-16, -6, -4], [16, 8, 4]], sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] },
                    ], p);
                } else {
                    p.y += 6;
                    this.spawn([
                        { texture: T.smoke, burst: 5, capacity: 6, life: [0.9, 1.5], size: [10, 18], speed: [3, 9], color: '#7d7f88', alpha: 0.55, blend: 'standard',
                          direction: [[-0.5, 0.6, -0.3], [0.5, 1.2, 0.3]], gravity: [0, 6, 0], sizeGradient: [[0, 0.5], [1, 1.8]], spin: [-1, 1] },
                    ], p);
                }
                break;
            }
            case 'cash': {
                const p = e.pos ? P(e.pos) : head(); if (!p) break;
                p.y += 14;
                this.spawn([
                    { texture: T.coin, burst: 9, capacity: 10, life: [0.9, 1.3], size: [28, 38], speed: [150, 260], color: '#ffffff', spin: [-5, 5], blend: 'standard',
                      direction: [[-0.45, 1, -0.25], [0.45, 1.6, 0.25]], gravity: [0, -420, 0], sizeGradient: [[0, 0.4], [0.15, 1], [0.85, 1], [1, 0.5]] },
                    { texture: T.conf1, burst: 6, capacity: 8, life: [0.9, 1.4], size: [22, 30], speed: [120, 220], color: '#3fbf5a', color2: '#7fd66c', spin: [-6, 6], blend: 'standard',
                      direction: [[-0.6, 1, -0.3], [0.6, 1.5, 0.3]], gravity: [0, -340, 0] },
                    { texture: T.coinSpark, burst: 6, capacity: 8, life: [0.4, 0.8], size: [20, 34], speed: [30, 90], color: '#ffd23f', blend: 'standard', box: [[-24, 0, -10], [24, 40, 10]], sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] },
                    { texture: T.flare, burst: 1, capacity: 1, life: [0.3, 0.3], size: [70, 70], speed: [0, 0], color: '#ffc400', alpha: 0.8, blend: 'standard', sizeGradient: [[0, 0.4], [0.3, 1], [1, 0.4]] },
                ], p);
                break;
            }
            case 'levelup': {
                const pl = GameSalon.player; if (!pl) break;
                const base = new BABYLON.Vector3(pl.x, SALON_FLOOR_H + 3, pl.y);
                // кольца — на уровне груди (плоскость-спрайт, нижняя половина не уходит в пол)
                this.spawn([
                    { texture: T.ring, burst: 1, capacity: 1, life: [0.8, 0.8], size: [40, 40], speed: [0, 0], color: '#ffd23f', alpha: 1, blend: 'standard', sizeGradient: [[0, 0.4], [1, 5]] },
                    { delay: 0.12, texture: T.ring, burst: 1, capacity: 1, life: [0.8, 0.8], size: [40, 40], speed: [0, 0], color: '#ff8fc8', alpha: 0.9, blend: 'standard', sizeGradient: [[0, 0.3], [1, 4]] },
                ], new BABYLON.Vector3(pl.x, SALON_FLOOR_H + 60, pl.y));
                this.spawn([
                    { texture: T.sparkle, burst: 16, capacity: 18, life: [0.9, 1.5], size: [30, 50], speed: [30, 90], color: '#ffb300', color2: '#ff7ab8', blend: 'standard', spin: [-2, 2],
                      box: [[-60, 0, -60], [60, 6, 60]], direction: [[-0.15, 1, -0.15], [0.15, 1.6, 0.15]], gravity: [0, 40, 0], sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] },
                    { texture: T.star, burst: 8, capacity: 10, life: [1, 1.6], size: [28, 42], speed: [80, 170], color: '#ffb300', color2: '#ff9a1f', blend: 'standard', spin: [-3, 3],
                      box: [[-30, 60, -30], [30, 150, 30]], direction: [[-0.7, 0.6, -0.7], [0.7, 1.5, 0.7]], gravity: [0, -140, 0], sizeGradient: [[0, 0.3], [0.2, 1], [0.8, 0.9], [1, 0]] },
                ], base);
                break;
            }
            case 'unlock': {
                const p = e.pos ? P(e.pos) : null; if (!p) break;
                this.spawn([
                    { texture: T.flash, burst: 2, capacity: 3, life: [0.4, 0.5], size: [150, 200], speed: [0, 1], color: '#ffcf33', blend: 'standard', spin: [-1, 1], sizeGradient: [[0, 0.2], [0.25, 1], [1, 0.5]] },
                    { texture: T.streak, burst: 14, capacity: 16, life: [0.35, 0.6], size: [50, 80], speed: [180, 360], color: '#ffb300', color2: '#ff7ab8', blend: 'standard', spin: [-1, 1],
                      direction: [[-1, 0.2, -0.3], [1, 1.4, 0.3]], sizeGradient: [[0, 1], [1, 0.2]] },
                    { texture: T.star, burst: 14, capacity: 16, life: [1, 1.6], size: [28, 44], speed: [140, 280], color: '#ffb300', color2: '#ff7ab8', blend: 'standard', spin: [-4, 4],
                      direction: [[-0.7, 1, -0.4], [0.7, 1.7, 0.4]], gravity: [0, -300, 0], sizeGradient: [[0, 0.3], [0.2, 1], [0.8, 0.9], [1, 0]] },
                    { texture: T.sparkle, burst: 16, capacity: 18, life: [0.6, 1.2], size: [24, 40], speed: [60, 200], color: '#ffc400', color2: '#ff9fd0', blend: 'standard', spin: [-2, 2],
                      box: [[-50, -10, -50], [50, 30, 50]], sizeGradient: [[0, 0.2], [0.3, 1], [1, 0]] },
                ], p);
                break;
            }
        }
    },

    // Волосинки среза: накопленные за кадры срезы — одним всплеском не чаще cutGap.
    flushCut() {
        if (this.t < this.cutT || !this.cutPos || this.cutN <= 0) return;
        const n = Math.min(FX_CFG.cutMaxBurst, 2 + Math.round(this.cutN * 0.6));
        this.cutN = 0; this.cutT = this.t + FX_CFG.cutGap;
        let hex = '#6b4630';
        try { hex = GameCut.cust.data.spec.color || hex; } catch (_) { /* клиента нет */ }
        this.spawn([
            { texture: FX_TEX.hair, burst: n, capacity: 8, life: [0.45, 0.85], size: [1.2, 2.5], speed: [14, 40], color: hex, color2: GameFx.shade(hex, 0.78), blend: 'standard', spin: [-6, 6],
              direction: [[-1, 0.1, -0.6], [1, 1, 0.6]], gravity: [0, -48, 0], sizeGradient: [[0, 1], [0.75, 1], [1, 0.4]] },
        ], this.cutPos, true);
    },

    shade(hex, k) {
        const c = HairUtil.rgb(hex), h = (v) => ('0' + Math.round(HairUtil.clamp(v * k, 0, 1) * 255).toString(16)).slice(-2);
        return '#' + h(c[0]) + h(c[1]) + h(c[2]);
    },

    // Фоновые: пылинки в зале и мерцание над ромбами-указателями (только в режиме зала).
    syncAmbient() {
        const fx = this.fx();
        if (!fx) return;
        const alive = (h) => !!h && [...fx.effects].some(e => e.system === h.system);
        if (Game.mode !== 'salon') {
            if (this.motes) { this.motes.dispose(); this.motes = null; }
            if (this.pinFx) { this.pinFx.dispose(); this.pinFx = null; }
            return;
        }
        const rm = typeof GameSalon !== 'undefined' ? GameSalon.room : null;
        if (!alive(this.motes) && rm) {
            const m = FX_CFG.mote, cx = (rm.x0 + rm.x1) / 2, cz = (rm.y0 + rm.y1) / 2, hx = (rm.x1 - rm.x0) / 2 - 20, hz = (rm.y1 - rm.y0) / 2 - 20;
            this.motes = fx.create({ texture: FX_TEX.soft, rate: m.rate, capacity: 70, life: m.life, size: m.size, speed: [0.5, 2.5], color: '#e8cf8f', alpha: m.alpha, blend: 'standard',
                position: new BABYLON.Vector3(cx, 70, cz), box: [[-hx, -50, -hz], [hx, 60, hz]], direction: [[-0.3, -0.1, -0.3], [0.3, 0.3, 0.3]],
                colorGradient: [[0, '#e8cf8f', 0], [0.25, '#e8cf8f', m.alpha], [0.75, '#e8cf8f', m.alpha], [1, '#e8cf8f', 0]] });
        }
        if (!alive(this.pinFx)) {
            this.pinFx = fx.create({ texture: FX_TEX.sparkle4, rate: FX_CFG.pinRate, capacity: 14, life: [0.5, 0.9], size: [14, 22], speed: [4, 16], color: '#ffb300', blend: 'standard',
                position: new BABYLON.Vector3(0, -999, 0), box: [[-14, 14, -14], [14, 36, 14]], direction: [[-0.3, 0.3, -0.3], [0.3, 1, 0.3]],
                sizeGradient: [[0, 0.2], [0.35, 1], [1, 0]], follow: () => this.pinPos() });
        }
    },

    // Следующий включённый ромб-указатель по кругу.
    pinPos() {
        const pins = (typeof GameSalon !== 'undefined' && /** @type {any} */ (GameSalon).pins) || [];
        for (let k = 0; k < pins.length; k++) {
            this._pinI = (this._pinI + 1) % pins.length;
            const m = pins[this._pinI];
            if (m && m.isEnabled()) return m.getAbsolutePosition();
        }
        return new BABYLON.Vector3(0, -999, 0);
    },

    update(dt) {
        this.t += dt;
        this.flushCut();
        this.sparkT -= dt;
        if (this.sparkT <= 0) { this.sparkT = 1; this.syncAmbient(); }
    },

    // Перекраска модели с цветом в вершинах: пары [изЦвета, вЦвет] по оттенку — тени и блики
    // исходной раскраски сохраняются. Исходные цвета запоминаются: повторная перекраска идёт от них.
    recolor(mesh, pairs) {
        if (!mesh || !mesh.getVerticesData) return;
        const kind = BABYLON.VertexBuffer.ColorKind;
        const md = mesh.metadata || (mesh.metadata = {});
        if (!md.baseColors) { const src = mesh.getVerticesData(kind); if (!src) return; md.baseColors = new Float32Array(src); }
        const base = md.baseColors, out = new Float32Array(base);
        const rule = pairs.map(([a, b]) => ({ from: GameFx.hsv(HairUtil.rgb(a)), to: GameFx.hsv(HairUtil.rgb(b)) }));
        const c = [0, 0, 0];
        for (let i = 0; i < base.length; i += 4) {
            const h = GameFx.hsv([base[i], base[i + 1], base[i + 2]]);
            if (h[1] < 0.22) continue;
            for (const r of rule) {
                let dh = Math.abs(h[0] - r.from[0]); if (dh > 0.5) dh = 1 - dh;
                if (dh > 0.055) continue;
                const v = HairUtil.clamp(h[2] / Math.max(0.05, r.from[2]) * r.to[2], 0, 1);
                const s = HairUtil.clamp(h[1] / Math.max(0.05, r.from[1]) * r.to[1], 0, 1);
                GameFx.rgbOf(r.to[0], s, v, c);
                out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
                break;
            }
        }
        mesh.setVerticesData(kind, out, true, 4);
    },

    hsv(c) {
        const r = c[0], g = c[1], b = c[2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        let h = 0;
        if (d > 1e-5) {
            if (mx === r) h = ((g - b) / d + 6) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
            h /= 6;
        }
        return [h, mx > 1e-5 ? d / mx : 0, mx];
    },

    rgbOf(h, s, v, out) {
        const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
        const m = i % 6;
        out[0] = [v, q, p, p, t, v][m]; out[1] = [t, v, v, q, p, p][m]; out[2] = [p, p, t, v, v, q][m];
        return out;
    },
};
