// GameSalon.js — салон: комната (пол, стены с проёмами, улица), мебель карты, мастер (игрок),
// клиенты (приход, ожидание, кресло, уход), дверь, коробка с новинками, подметание.
// Точки логики — маркеры карты (Maps.js): room, spawn, chair, wait*, street*, door-in/out, hall, box.

const SALON_FLOOR_H = 2;          // px: верх пола над землёй
const SALON_WALL_T = 14;          // px: толщина стен
// Препятствия для игрока по модели: [радиус px, полуразмах вдоль ширины px (3 круга) или 0]
const SALON_SOLID = {
    'barber_chair': [50, 0], 'station': [34, 44], 'waiting_chair': [38, 0], 'reception': [36, 50],
    'shelf': [26, 44], 'plant': [34, 0], 'trash_bin': [22, 0], 'sofa': [40, 44],
};

/** @satisfies {Record<string, any>} */
const GameSalon = {
    /** @type {LoryApp | null} */ app: null,
    /** @type {any} */ view: null,
    /** @type {any} */ scene: null,
    /** @type {any} */ loc: null,
    /** @type {any} */ broom: null,
    /** @type {any} */ chairRec: null,
    /** @type {any} */ clumpNode: null,
    /** @type {any[]} */ closeUp: [],
    /** @type {any[]} */ cars: [],
    roadX0: -700, roadX1: 2500,
    _closeUp: false,
    room: { x0: 400, y0: 400, x1: 1400, y1: 1100, H: 300 },
    theme: ['#c9c4f5', '#fff4e0', '#27314f'],
    /** @type {{ x: number, y: number, r: number }[]} */ obstacles: [],
    /** @type {any} */ player: null,
    /** @type {any[]} */ customers: [],
    /** @type {any} */ chair: null,
    /** @type {any[]} */ waits: [],
    /** @type {any} */ door: null,
    /** @type {any} */ box: null,
    /** @type {HairClumps | null} */ clumps: null,
    spawnT: 1.2,
    sweepT: -1,
    /** @type {string[]} */ capeColors: ['#f4f6fb', '#dfe5f2', '#23c4c9'],
    capePattern: 'stripes',
    floorPattern: 'checker',
    chairColors: null,
    _mats: [],

    async build(app) {
        this.app = app;
        const loc = app.location, view = loc.view, scene = view.scene;
        this.view = view; this.scene = scene; this.loc = loc;
        const rm = loc.marker('room');
        if (rm) {
            const w = rm.scale[0] * 50, d = rm.scale[2] * 50;
            this.room = { x0: rm.x - w, x1: rm.x + w, y0: rm.y - d, y1: rm.y + d, H: rm.scale[1] * 100 };
        }
        this.buildRoom();
        this.setupProps();
        // места
        const mk = (m) => ({ x: m.x, y: m.y, heading: (m.rot ? m.rot[1] : 0) * Math.PI / 180, cust: null });
        const ch = loc.marker('chair');
        this.chair = Object.assign(mk(ch), { seatH: 55 });
        this.waits = loc.markers('wait').map(mk);
        // клочки у кресла: узел в точке головы сидящего клиента
        const node = new BABYLON.TransformNode('clump-node', scene);
        node.position.set(this.chair.x, SALON_FLOOR_H + 55 - (CH.legH - CH.legW * 0.5) * CHAR_PX + CH.headY * CHAR_PX, this.chair.y);
        node.rotation.y = Math.PI / 2 - this.chair.heading;
        node.scaling.setAll(CHAR_PX);
        this.clumpNode = node;
        const max = typeof HAIR_CLUMPS_MAX !== 'undefined' ? HAIR_CLUMPS_MAX : 460;
        this.clumps = new HairClumps(scene, node, IS_MOBILE ? Math.round(max * 0.6) : max);
        this.clumps.floorY = -(node.position.y - SALON_FLOOR_H) / CHAR_PX;
        // мастер
        const sp = loc.marker('spawn') || { x: 880, y: 860 };
        this.player = { char: null, x: sp.x, y: sp.y, heading: -Math.PI / 2, moving: false, stepT: 0, skinId: '' };
        this.dressPlayer(GAME_SHOP_ITEMS.find(it => it.tab === 'skin'));
        // метла и коробка
        await this.loadExtras();
        this.buildMarkers();
    },

    // Скин мастера (предмет магазина вкладки skin): внешность, причёска и борода — новый персонаж на том же месте.
    dressPlayer(item) {
        const p = this.player;
        if (!item || !p || p.skinId === item.id) return;
        p.skinId = item.id;
        const old = p.char, ch = new SalonChar(this.view, item.look);
        const spec = GameData.skinHair(item);
        if (spec) ch.setHair(HairField.generate(spec, 4242, 1500), { lodDiv: 1 });
        ch.place(p.x, p.y, SALON_FLOOR_H, p.heading);
        if (old) {
            ch.setVisible(old.root.isEnabled());
            if (this.broom) this.broom.parent = ch.root;
            old.dispose();
        }
        p.char = ch;
    },

    // --- комната ---------------------------------------------------------------------------------

    buildRoom() {
        const scene = this.scene, view = this.view, r = this.room, T = SALON_WALL_T, FH = SALON_FLOOR_H;
        const W = r.x1 - r.x0, D = r.y1 - r.y0, cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
        const add = (mesh, shadow) => World3D.addObject(view, mesh, 'prop', { ink: false, outline: false, castShadow: !!shadow });
        const box = (name, w, h, d, x, y, z, mat) => {
            const m = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
            m.position.set(x, y, z); m.material = mat; m.isPickable = false;
            add(m, false);
            return m;
        };
        const plain = (name, hex) => {
            const m = new BABYLON.StandardMaterial(name, scene);
            m.diffuseColor = BABYLON.Color3.FromHexString(hex); m.specularColor = new BABYLON.Color3(0, 0, 0);
            this._mats.push(m);
            return m;
        };
        // пол: шашечка из двух тонов
        this.floorTex = new BABYLON.DynamicTexture('salon-floor', { width: 256, height: 256 }, scene, true);
        const fm = new BABYLON.StandardMaterial('salon-floor-mat', scene);
        fm.diffuseTexture = this.floorTex; fm.specularColor = new BABYLON.Color3(0.06, 0.06, 0.06); fm.specularPower = 40;
        this.floorTex.wrapU = this.floorTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;   // DynamicTexture по умолчанию не повторяется
        this.floorTex.uScale = W / 100; this.floorTex.vScale = D / 100;
        this.floorMat = fm;
        const floor = BABYLON.MeshBuilder.CreateGround('salon-floor', { width: W, height: D }, scene);
        floor.position.set(cx, FH, cy); floor.material = fm; floor.isPickable = false;
        add(floor, false);
        this.floor = floor;
        // стены: текстура — цвет стены сверху, панель снизу
        this.wallTex = new BABYLON.DynamicTexture('salon-wall', { width: 32, height: 256 }, scene, true);
        const wm = new BABYLON.StandardMaterial('salon-wall-mat', scene);
        wm.diffuseTexture = this.wallTex; wm.specularColor = new BABYLON.Color3(0, 0, 0);
        this.wallMat = wm; this.wallPlain = plain('salon-wall-plain', this.theme[0]); this.trimPlain = plain('salon-trim-plain', this.theme[1]);
        this.accentMat = plain('salon-accent', this.theme[2]);
        const H = r.H;
        // Стена с текстурой: своя коробка с известной раскладкой UV (у коробки Babylon грани повёрнуты по-разному):
        // боковые грани — вся текстура снизу вверх, верх и низ — полоска цвета стены.
        const WR = { px: [0, 0, 32, 256], nx: [0, 0, 32, 256], pz: [0, 0, 32, 256], nz: [0, 0, 32, 256], py: [0, 4, 32, 16], ny: [0, 4, 32, 16] };
        const wall = (name, w, h, d, x, y, z) => {
            const m = GameGeo.mesh(scene, name, GameGeo.box(w, h, d, WR, 32, 256, 0));
            m.position.set(x, y, z); m.material = wm; m.isPickable = false;
            add(m, false);
            return m;
        };
        wall('wall-left', T, H, D, r.x0 - T / 2, H / 2, cy);
        wall('wall-right', T, H, D, r.x1 + T / 2, H / 2, cy);
        // задняя стена с проёмами (дверь, витрина)
        const loc = this.loc, holes = [];
        const dw = loc.marker('doorway'), ww = loc.marker('windowway');
        if (dw) holes.push({ x: dw.x, w: dw.scale[0] * 100, bottom: 0, top: dw.scale[1] * 100 });
        if (ww) holes.push({ x: ww.x, w: ww.scale[0] * 100, bottom: ww.h, top: ww.h + ww.scale[1] * 100 });
        holes.sort((a, b) => a.x - b.x);
        let x = r.x0 - T;
        const zc = r.y0 - T / 2;
        for (const h of holes) {
            const a = h.x - h.w / 2, b = h.x + h.w / 2;
            if (a > x) wall('wall-back', a - x, H, T, (x + a) / 2, H / 2, zc);
            if (h.top < H) box('wall-lintel', h.w, H - h.top, T, h.x, (H + h.top) / 2, zc, this.wallPlain);
            if (h.bottom > 0) box('wall-sill', h.w, h.bottom, T, h.x, h.bottom / 2, zc, this.trimPlain);
            x = b;
        }
        if (x < r.x1 + T) wall('wall-back', r.x1 + T - x, H, T, (x + r.x1 + T) / 2, H / 2, zc);
        // порог спереди и плинтус
        box('salon-curb', W + T * 2, 8, 8, cx, 4, r.y1 + 4, this.accentMat);
        // Передняя стена и потолок: в зале их нет (вид «кукольный домик»), а при стрижке камера внутри
        // комнаты — они включаются (setCloseUp), и за головой клиента всегда интерьер, а не пустое поле.
        const ceilMat = plain('salon-ceiling', '#fff8ee');
        this.closeUp = [
            wall('wall-front', W + T * 2, H, T, cx, H / 2, r.y1 + T / 2 + 8),
            box('salon-ceiling', W + T * 2, 6, D + T * 2 + 8, cx, H + 3, cy + 4, ceilMat),
        ];
        for (const m of this.closeUp) m.setEnabled(false);
        // улица: тротуар и дорога
        const mapW = this.loc.width || 1800;
        const walk = plain('street-walk', '#d5d9e3'), road = plain('street-road', '#566074'), line = plain('street-line', '#f4f1e8');
        const sy0 = r.y0 - T - 170;
        box('sidewalk', mapW + 800, 6, 170, mapW / 2, 0, r.y0 - T - 85, walk);
        box('road', mapW + 800, 4, 380, mapW / 2, -1, sy0 - 190, road);
        box('curb-street', mapW + 800, 9, 10, mapW / 2, 1, sy0, plain('street-curb', '#b9bfcc'));
        box('sidewalk-far', mapW + 800, 6, 150, mapW / 2, 0, sy0 - 380 - 75, walk);
        box('curb-far', mapW + 800, 9, 10, mapW / 2, 1, sy0 - 380, plain('street-curb-far', '#b9bfcc'));
        this.roadX0 = -700; this.roadX1 = mapW + 700;
        box('walk-front', W + 2 * T + 240, 6, 150, cx, 0, r.y1 + 8 + 75, walk);
        for (let i = -3; i < 16; i++) box('road-dash', 70, 5.2, 9, i * 150, -1, sy0 - 190, line);
        this.paintTheme();
    },

    // Комната замкнута (передняя стена, потолок и их декор видны): включается, когда камера внутри.
    setCloseUp(on) {
        if (this._closeUp === !!on) return;
        this._closeUp = !!on;
        for (const m of this.closeUp || []) m.setEnabled(!!on);
    },

    // Цвета салона (косметика магазина): [стены, панель и пол, акцент].
    setTheme(colors, pattern) {
        if (!colors) return;
        this.theme = colors.slice(0, 3);
        this.floorPattern = pattern || 'checker';
        this.paintTheme();
    },

    paintTheme() {
        const [wall, trim, accent] = this.theme;
        if (this.wallTex) {
            const g = /** @type {CanvasRenderingContext2D} */ (this.wallTex.getContext());
            g.fillStyle = wall; g.fillRect(0, 0, 32, 256);
            const gr = g.createLinearGradient(0, 0, 0, 170);
            gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)');
            g.fillStyle = gr; g.fillRect(0, 0, 32, 170);
            g.fillStyle = trim; g.fillRect(0, 176, 32, 80);
            g.fillStyle = accent; g.fillRect(0, 170, 32, 7);
            g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(0, 246, 32, 10);
            this.wallTex.update();
        }
        if (this.floorTex) {
            const g = /** @type {CanvasRenderingContext2D} */ (this.floorTex.getContext());
            const a = trim, b = GameGeo.shade(wall, -0.03), pat = this.floorPattern || 'checker';
            if (pat === 'diamond' || pat === 'dots') {
                // ромбы или круги: фигура в центре плитки и четвертинки в углах — стык бесшовный
                g.fillStyle = a; g.fillRect(0, 0, 256, 256);
                g.fillStyle = b;
                for (const [x, y] of [[128, 128], [0, 0], [256, 0], [0, 256], [256, 256]]) {
                    g.beginPath();
                    if (pat === 'dots') g.arc(x, y, 62, 0, Math.PI * 2);
                    else { g.moveTo(x, y - 92); g.lineTo(x + 92, y); g.lineTo(x, y + 92); g.lineTo(x - 92, y); g.closePath(); }
                    g.fill();
                    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 4; g.stroke();
                }
            } else if (pat === 'stripes') {
                for (let i = 0; i < 4; i++) {
                    g.fillStyle = i % 2 ? a : b; g.fillRect(i * 64, 0, 64, 256);
                    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(i * 64, 0, 3, 256);
                }
            } else {
                for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
                    g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * 128, j * 128, 128, 128);
                    g.strokeStyle = 'rgba(0,0,0,0.07)'; g.lineWidth = 4; g.strokeRect(i * 128 + 2, j * 128 + 2, 124, 124);
                    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(i * 128 + 6, j * 128 + 6, 116, 116);
                }
            }
            this.floorTex.update();
        }
        if (this.wallPlain) this.wallPlain.diffuseColor = BABYLON.Color3.FromHexString(wall);
        if (this.trimPlain) this.trimPlain.diffuseColor = BABYLON.Color3.FromHexString(trim);
        if (this.accentMat) this.accentMat.diffuseColor = BABYLON.Color3.FromHexString(accent);
    },

    // --- мебель карты ------------------------------------------------------------------------------

    modelId(def) { const m = /([a-z0-9_]+)\.glb$/i.exec(def.model || ''); return m ? m[1] : ''; },

    part(rec, name) {
        if (!rec || !rec.mesh) return null;
        return rec.mesh.getChildMeshes(false).find(m => m.metadata && m.metadata.part === name) || null;
    },

    setupProps() {
        const loc = this.loc;
        this.obstacles = [];
        for (const rec of loc.objects) {
            const def = rec.def, id = this.modelId(def);
            if (!id || !rec.mesh) continue;
            const s = SALON_SOLID[id];
            if (s) {
                const a = (def.rot ? def.rot[1] : 0) * Math.PI / 180, wx = -Math.sin(a), wy = Math.cos(a);
                if (s[1]) for (const k of [-1, 0, 1]) this.obstacles.push({ x: def.x + wx * s[1] * k, y: def.y + wy * s[1] * k, r: s[0] });
                else this.obstacles.push({ x: def.x, y: def.y, r: s[0] });
            }
            if (id === 'window') {
                const glass = this.part(rec, 'Glass');
                if (glass && glass.material) { const m = glass.material.clone('window-glass'); m.alpha = 0.3; glass.material = m; this._mats.push(m); }
            } else if (id === 'door') {
                const leaf = this.part(rec, 'Leaf');
                if (leaf) {
                    const p = leaf.metadata.pivot || [0, 0, 0];
                    leaf.setPivotPoint(new BABYLON.Vector3(p[0], p[1], p[2]));
                    this.door = { leaf, x: def.x, y: def.y, open: 0 };
                }
            } else if (id === 'barber_chair' && !this.chairRec) {
                this.chairRec = rec;
            } else if (id === 'car_a' || id === 'car_b') {
                // машины ездят по дороге туда-сюда (каждая по своей полосе)
                const a = (def.rot ? def.rot[1] : 0) * Math.PI / 180;
                (this.cars || (this.cars = [])).push({ mesh: rec.mesh, dir: Math.cos(a) >= 0 ? 1 : -1, speed: 150 + this.cars.length * 45, wait: 0 });
            }
            // стены и навесное теней не дают: комната светлая
            if (id === 'ceiling_lamp' || id === 'window' || id === 'door' || id === 'sign' || id === 'awning') {
                for (const m of rec.mesh.getChildMeshes(false)) this.view.removeShadowCaster && this.view.removeShadowCaster(m);
            }
        }
        if (this.chairColors) this.skinChair(this.chairColors);
    },

    // Перекрасить кресло (косметика магазина).
    skinChair(colors) {
        this.chairColors = colors;
        const seat = this.part(this.chairRec, 'Seat');
        if (seat && colors) GameFx.recolor(seat, [['#23c4c9', colors[0]], ['#ff6b6b', colors[1]], ['#e3b04b', colors[2]]]);
    },

    async loadExtras() {
        const scene = this.scene, view = this.view;
        const make = (model, name) => {
            if (!model) return null;
            const root = Model3D.build(model, scene, { name });
            World3D.addObject(view, root, 'prop', { ink: false, outline: false });
            root.setEnabled(false);
            return root;
        };
        const skip = (e) => { console.warn('GameSalon: нет модели', e); return null; };
        const got = await Promise.all([
            Model3D.load('assets/models/gear/broom.glb').catch(skip), Model3D.load('assets/models/gear/supply_box.glb').catch(skip),
            Model3D.load('assets/models/salon/poster_a.glb').catch(skip), Model3D.load('assets/models/salon/poster_b.glb').catch(skip),
        ]);
        const broom = make(got[0], 'broom'), box = make(got[1], 'supply-box');
        const pa = make(got[2], 'front-poster-a'), pb = make(got[3], 'front-poster-b');
        // картины на передней стене (видны только крупным планом, вместе со стеной)
        const rm = this.room, fy = rm.y1 + 4;
        const hang = (m, x, h) => { if (!m) return; m.position.set(x, h, fy); m.rotation.y = Math.PI / 2; this.view.removeShadowCaster && this.view.removeShadowCaster(m); this.closeUp.push(m); };
        hang(pa, rm.x0 + 260, 178); hang(pb, rm.x0 + 620, 178);
        this.broom = broom;
        if (broom) { broom.parent = this.player.char.root; broom.scaling.setAll(1 / CHAR_PX); broom.position.set(0.5, 0, 1.25); broom.rotation.y = Math.PI / 2; }
        const bm = this.loc.marker('box') || { x: 1010, y: 560, rot: [0, 0, 0] };
        this.box = { root: box, x: bm.x, y: bm.y, active: false, open: 0, opening: false, flaps: [] };
        if (box) {
            box.position.set(bm.x, SALON_FLOOR_H, bm.y);
            box.rotation.y = -(bm.rot ? bm.rot[1] : 0) * Math.PI / 180;
            for (const m of box.getChildMeshes(false)) {
                const p = m.metadata && m.metadata.part;
                if (p === 'FlapL' || p === 'FlapR') {
                    const pv = m.metadata.pivot || [0, 0, 0];
                    m.setPivotPoint(new BABYLON.Vector3(pv[0], pv[1], pv[2]));
                    this.box.flaps.push({ mesh: m, sign: p === 'FlapL' ? -1 : 1 });
                }
            }
        }
    },

    // Прыгающие ромбы-указатели над тем, с чем можно взаимодействовать.
    buildMarkers() {
        const scene = this.scene;
        const mat = new BABYLON.StandardMaterial('salon-pin-mat', scene);
        mat.disableLighting = true; mat.emissiveColor = BABYLON.Color3.FromHexString('#ffd23f'); mat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        mat.metadata = { toon: false };
        this._mats.push(mat);
        this.pins = [];
        for (let i = 0; i < 5; i++) {
            const m = BABYLON.MeshBuilder.CreatePolyhedron('salon-pin', { type: 1, size: 9 }, scene);
            m.scaling.set(0.8, 1.25, 0.8); m.material = mat; m.isPickable = false; m.setEnabled(false);
            this.pins.push(m);
        }
    },

    // --- клиенты -----------------------------------------------------------------------------------

    strands() {
        const n = typeof HAIR_STRANDS !== 'undefined' ? HAIR_STRANDS : 11000, nm = typeof HAIR_STRANDS_MOBILE !== 'undefined' ? HAIR_STRANDS_MOBILE : 5200;
        return IS_MOBILE ? nm : n;
    },

    // seated — клиент сразу сидит на месте ожидания (первый клиент при запуске).
    spawnCustomer(forced, seated) {
        const seat = this.waits.find(w => !w.cust);
        if (!seat) return null;
        const save = Game.save;
        save.seed = (save.seed || 1) + 1;
        const data = GameData.customer(Game.gearLevel(), save.seed * 7919 + 13, forced);
        const loc = this.loc, st = loc.marker('street') || { x: 1740, y: 310 };
        const char = new SalonChar(this.view, data.look);
        const field = HairField.generate(data.spec, data.seed, this.strands());
        char.setHair(field, { lodDiv: typeof HAIR_LOD_DIV !== 'undefined' ? HAIR_LOD_DIV : 7 });
        char.place(st.x, st.y, 3, Math.PI);
        const c = { data, char, field, state: 'enter', seat, x: st.x, y: st.y, path: [], speed: 165 + Math.random() * 25, wait: 0, said: false };
        seat.cust = c;
        const pt = (name, dx, dy) => { const m = loc.marker(name); return m ? { x: m.x + (dx || 0), y: m.y + (dy || 0) } : null; };
        c.path = [pt('door-out'), pt('door-in'), pt('hall', 0, seat.y - 700 > 60 ? 80 : 0), { x: seat.x - 62, y: seat.y }, { x: seat.x, y: seat.y }].filter(Boolean);
        this.customers.push(c);
        if (seated) { c.path = []; c.bell = true; this.arrive(c); }
        return c;
    },

    // Пригласить ждущего клиента в кресло.
    invite(c) {
        if (this.chair.cust || c.state !== 'waiting') return false;
        const loc = this.loc, ch = this.chair, hall = loc.marker('hall') || { x: 1130, y: 700 };
        c.seat.cust = null; c.seat = null;
        ch.cust = c; c.state = 'toChair';
        c.char.setPose('stand');
        c.path = [{ x: c.x - 62, y: c.y }, { x: hall.x - 120, y: ch.y + 150 }, { x: ch.x + 6, y: ch.y + 92 }, { x: ch.x, y: ch.y }];
        Tutorial.complete('invite');
        Game.emit('say', { name: c.data.name, text: GameData.line('g.seat'), portrait: GameData.portraitNow(c.data, c.field, 'happy') });
        Sound.play(['assets/sounds/voice-happy-1.ogg', 'assets/sounds/voice-happy-2.ogg', 'assets/sounds/voice-happy-3.ogg'], { volume: 0.45 });
        return true;
    },

    // Клиент встаёт из кресла и уходит.
    release(c) {
        const loc = this.loc, ch = this.chair;
        if (ch.cust === c) ch.cust = null;
        c.state = 'leaving';
        c.char.setCape(false); c.char.setPose('stand');
        const hall = loc.marker('hall') || { x: 1130, y: 700 }, di = loc.marker('door-in'), dout = loc.marker('door-out'), st = loc.marker('street-2') || { x: 60, y: 310 };
        c.x = ch.x + 6; c.y = ch.y + 60;
        c.path = [{ x: ch.x + 20, y: ch.y + 110 }, { x: hall.x - 60, y: hall.y + 40 }, di, dout, st].filter(Boolean);
    },

    updateCustomer(c, dt) {
        const ch = c.char;
        let moving = false;
        if (c.path.length) {
            const p = c.path[0], dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy), step = c.speed * dt;
            if (d <= step) { c.x = p.x; c.y = p.y; c.path.shift(); }
            else { c.x += dx / d * step; c.y += dy / d * step; ch.heading = Math.atan2(dy, dx); moving = true; }
            const inside = c.y > this.room.y0;
            ch.place(c.x, c.y, inside ? SALON_FLOOR_H : 3, ch.heading);
            if (!c.path.length) this.arrive(c);
            else moving = true;
        }
        if (c.state === 'gone') return false;            // ушёл: персонаж уже убран со сцены
        if (c.state === 'enter' && !c.bell && c.y > this.room.y0 - 20) { c.bell = true; Sound.play('assets/sounds/door-bell.ogg', { volume: 0.5 }); }
        ch.update(dt, moving, c.speed / 170);
        return true;
    },

    arrive(c) {
        const ch = c.char;
        if (c.state === 'enter') {
            c.state = 'waiting';
            ch.setPose('sit', 45);
            const h = c.seat.heading;
            ch.place(c.seat.x - Math.cos(h) * 8, c.seat.y - Math.sin(h) * 8, SALON_FLOOR_H, h);
            c.x = c.seat.x; c.y = c.seat.y;
            Sound.play('assets/sounds/sit.ogg', { volume: 0.4 });
            if (!Tutorial.active) Game.emit('say', { name: c.data.name, text: GameData.line('g.hello'), portrait: GameData.portraitNow(c.data, c.field, 'neutral') });
        } else if (c.state === 'toChair') {
            c.state = 'seated';
            const k = this.chair, h = k.heading;
            ch.setPose('sit', k.seatH);
            ch.place(k.x - Math.cos(h) * 5, k.y - Math.sin(h) * 5, SALON_FLOOR_H, h);
            ch.setCape(true, this.capeColors, this.capePattern);
            Sound.play('assets/sounds/sit.ogg', { volume: 0.5 });
            Game.emit('fx', { type: 'sit', pos: ch.headWorld() });
            Game.onSeated(c);
        } else if (c.state === 'leaving') {
            c.state = 'gone';
            ch.dispose();
        }
    },

    // --- мастер ------------------------------------------------------------------------------------

    updatePlayer(dt, mv) {
        const p = this.player, ch = p.char, r = this.room;
        let vx = 0, vy = 0;
        if (this.sweepT < 0 && mv && (mv.x || mv.y)) { vx = mv.x; vy = -mv.y; }      // камера смотрит на север: вперёд = −y карты
        const len = Math.hypot(vx, vy);
        p.moving = len > 0.08;
        if (p.moving) {
            const sp = (typeof SALON_WALK_SPEED !== 'undefined' ? SALON_WALK_SPEED : 265) * Math.min(1, len);
            let nx = p.x + vx / len * sp * dt, ny = p.y + vy / len * sp * dt;
            const R = 24;
            nx = HairUtil.clamp(nx, r.x0 + R, r.x1 - R); ny = HairUtil.clamp(ny, r.y0 + R, r.y1 - R);
            for (let it = 0; it < 2; it++) for (const o of this.obstacles) {
                const dx = nx - o.x, dy = ny - o.y, d = Math.hypot(dx, dy), min = o.r + R;
                if (d < min && d > 1e-3) { nx = o.x + dx / d * min; ny = o.y + dy / d * min; }
            }
            // сидящие клиенты и коробка
            for (const c of this.customers) {
                if (c.state !== 'waiting' && c.state !== 'seated') continue;
                const dx = nx - c.x, dy = ny - c.y, d = Math.hypot(dx, dy), min = 30 + R;
                if (d < min && d > 1e-3) { nx = o2(c.x, dx, d, min); ny = o2(c.y, dy, d, min); }
            }
            p.x = nx; p.y = ny;
            // плавный разворот по ходу
            const want = Math.atan2(vy, vx);
            let diff = want - p.heading; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            p.heading += diff * (1 - Math.exp(-14 * dt));
            p.stepT -= dt * Math.min(1, len);
            if (p.stepT <= 0) { p.stepT = 0.3; Sound.play(['assets/sounds/step-1.ogg', 'assets/sounds/step-2.ogg', 'assets/sounds/step-3.ogg', 'assets/sounds/step-4.ogg'], { volume: 0.22 }); }
        }
        ch.place(p.x, p.y, SALON_FLOOR_H, p.heading);
        ch.update(dt, p.moving, 1.15);
        function o2(c, dv, d, min) { return c + dv / d * min; }
    },

    // Сколько клочков на полу.
    floorHair() { return this.clumps ? this.clumps.counts().floor : 0; },

    startSweep() {
        if (this.sweepT >= 0) return;
        this.sweepT = 0; this.sweepN = this.floorHair();
        this.player.char.setPose('sweep');
        if (this.broom) this.broom.setEnabled(true);
        // встать лицом к креслу
        this.player.heading = Math.atan2(this.chair.y - this.player.y, this.chair.x - this.player.x);
    },

    updateSweep(dt) {
        if (this.sweepT < 0) return;
        this.sweepT += dt / 1.7;
        const t = Math.min(1, this.sweepT);
        this.sndT = (this.sndT || 0) - dt;
        if (this.sndT <= 0) { this.sndT = 0.42; Sound.play(['assets/sounds/sweep-1.ogg', 'assets/sounds/sweep-2.ogg', 'assets/sounds/sweep-3.ogg'], { volume: 0.5 }); Game.emit('fx', { type: 'sweep', pos: this.player.char.root.getAbsolutePosition().clone() }); }
        if (this.broom) this.broom.rotation.z = Math.sin(this.player.char.time * 7) * 0.22;
        this.clumps.sweepFloor(0, 0, 1.5 + 14 * t);
        this.clumps.update(0);
        Game.emit('sweep', { progress: t });
        if (t >= 1) {
            this.sweepT = -1;
            this.clumps.sweepFloor(0, 0, 99);
            this.clumps._dirty = true; this.clumps.update(0);
            this.player.char.setPose('stand');
            if (this.broom) this.broom.setEnabled(false);
            Game.emit('sweep', { progress: null });
            Game.onSwept(this.sweepN);
        }
    },

    // Коробка с новинками появилась / открывается.
    showBox(on) {
        const b = this.box;
        b.active = !!on; b.open = 0; b.opening = false;
        if (b.root) { b.root.setEnabled(!!on); for (const f of b.flaps) f.mesh.rotation.x = 0; }
    },

    openBox() {
        const b = this.box;
        if (!b.active || b.opening) return;
        b.opening = true;
        Sound.play('assets/sounds/box-open.ogg', { volume: 0.6 });
    },

    // --- кадр --------------------------------------------------------------------------------------

    update(dt, mv, hubActive) {
        if (hubActive) { this.updatePlayer(dt, mv); this.updateSweep(dt); }
        // приход клиентов
        const alive = this.customers.filter(c => c.state !== 'gone' && c.state !== 'leaving').length;
        if (hubActive && alive < 3 && this.waits.some(w => !w.cust)) {
            this.spawnT -= dt;
            if (this.spawnT <= 0) { this.spawnCustomer(Game.firstRequest()); this.spawnT = (typeof SALON_SPAWN_SEC !== 'undefined' ? SALON_SPAWN_SEC : 9) + Math.random() * 8; }
        }
        for (let i = this.customers.length - 1; i >= 0; i--) {
            const c = this.customers[i];
            if (c.state === 'cutting') continue;                // ведёт режим стрижки
            if (!this.updateCustomer(c, dt)) this.customers.splice(i, 1);
        }
        // дверь открывается перед идущим
        if (this.door) {
            const d = this.door;
            let near = false;
            for (const c of this.customers) if ((c.state === 'enter' || c.state === 'leaving') && Math.hypot(c.x - d.x, c.y - d.y) < 150) near = true;
            d.open += ((near ? 1 : 0) - d.open) * (1 - Math.exp(-7 * dt));
            d.leaf.rotation.y = -d.open * 1.45;
        }
        // коробка
        const b = this.box;
        if (b && b.active && b.opening) {
            b.open = Math.min(1, b.open + dt * 1.6);
            const a = (1 - Math.pow(1 - b.open, 3)) * 1.95;
            for (const f of b.flaps) f.mesh.rotation.x = f.sign * a;
            if (b.open >= 1 && !b.done) { b.done = true; Game.onBoxOpened(); }
        }
        if (this.clumps && !GameCut.active) this.clumps.update(dt);
        // машины: доехала до края улицы — пауза и снова с другого края
        for (const c of this.cars || []) {
            if (c.wait > 0) { c.wait -= dt; continue; }
            c.mesh.position.x += c.dir * c.speed * dt;
            if (c.dir > 0 && c.mesh.position.x > this.roadX1) { c.mesh.position.x = this.roadX0; c.wait = 2 + Math.random() * 5; }
            else if (c.dir < 0 && c.mesh.position.x < this.roadX0) { c.mesh.position.x = this.roadX1; c.wait = 2 + Math.random() * 5; }
        }
        this.updatePins(dt, hubActive);
    },

    updatePins(dt, hubActive) {
        if (!this.pins) return;
        this.pinT = (this.pinT || 0) + dt;
        const list = [];
        if (hubActive && !Tutorial.active) {
            const ch = this.chair;
            if (ch.cust && ch.cust.state === 'seated') list.push({ x: ch.x, y: ch.y, h: 250 });
            else if (!ch.cust) for (const c of this.customers) if (c.state === 'waiting') list.push({ x: c.x, y: c.y, h: 215 });
            if (this.box.active && !this.box.opening) list.push({ x: this.box.x, y: this.box.y, h: 80 });
        }
        for (let i = 0; i < this.pins.length; i++) {
            const m = this.pins[i], p = list[i];
            m.setEnabled(!!p);
            if (!p) continue;
            m.position.set(p.x, p.h + Math.abs(Math.sin(this.pinT * 3.2 + i)) * 12, p.y);
            m.rotation.y = this.pinT * 2.4;
        }
    },
};
