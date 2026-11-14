// GameCut.js — режим стрижки крупным планом: камера-орбита вокруг головы клиента, инструменты
// на «пружине» (машинка с насадками, ножницы, щётка), стрижка HairField, клочки HairClumps,
// реакции клиента, оценка заказа.
//
// Координаты инструмента — «головные» (hu) в системе узла головы клиента. Игра зовёт
// GameCut.start({ cust, clumps, clumpNode, floorH, onFinish }), каждый кадр GameCut.update(dt),
// камеру берёт из GameCut.pose(out).

const CUT_TOOL_SCALE = 0.07;        // hu на px модели: инструмент ≈ вдвое крупнее настоящего (голова большая)
const CUT_BODY = [
    // плечи под накидкой, колени под накидкой, спинка кресла (hu, система головы)
    { cx: 0, cy: -1.62, cz: 0.02, hx: 2.24, hy: 0.9, hz: 1.0, r: 0.3, body: true },
    { cx: 0, cy: -3.12, cz: 2.0, hx: 1.3, hy: 0.62, hz: 1.2, r: 0.4, body: true },
    { cx: 0, cy: -2.45, cz: -1.12, hx: 1.1, hy: 1.28, hz: 0.2, r: 0.15, body: false },
];

/** @satisfies {Record<string, any>} */
const GameCut = {
    active: false,
    phase: 'cut',                 // 'cut' | 'brush' | 'end'
    tool: 'clipper',
    guard: 'g0',
    yaw: 0, pitch: 0.2, dist: 135, yawGoal: 0, pitchGoal: 0.2, distGoal: 135,
    rotHold: 0,
    faceYaw: 0,
    rage: 0,                      // ярость клиента 0..1: растёт от грубых ошибок, на 1 клиент убегает
    fled: false,
    calming: false,
    brushGoal: 3,
    /** @type {any} */ center: null,
    /** @type {any} */ view: null,
    /** @type {any} */ scene: null,
    /** @type {any} */ onFinish: null,
    /** @type {Record<string, boolean>} */ keys: {},
    /** @type {any} */ cust: null,
    /** @type {HairField | null} */ field: null,
    /** @type {HairClumps | null} */ clumps: null,
    /** @type {Record<string, any>} */ models: {},
    ptr: { x: 0, y: 0, down: false, id: -1, mode: '', lastX: 0, lastY: 0, inside: false, button: 0 },
    /** @type {Map<number, { x: number, y: number }>} */ touches: new Map(),
    pinch: 0,
    pos: [0, 0.6, 1.2], prev: [0, 0.6, 1.2], vel: [0, 0, 0], nrm: [0, 0, 1], head: [0, 1, 0],
    onSurface: false, onBody: false,
    snipT: 0, snipAnim: 0, wakeD: 0, scoreT: 0, sayT: 0, eyeT: 0, brushSndT: 0, moodT: 0, cutRate: 0, endT: 0,
    last: { progress: 0, stars: 0, over: 0, said: 0 },
    stats: { cut: 0, orbit: 0 },
    /** @type {any} */ loopBuzz: null,
    /** @type {any} */ loopCrunch: null,
    _bound: false,

    // Модели инструментов (под экраном загрузки).
    async preload(view) {
        const scene = view.scene;
        const add = (id, model) => {
            const root = Model3D.build(model, scene, { name: 'tool-' + id });
            root.scaling.setAll(CUT_TOOL_SCALE);
            root.setEnabled(false);
            World3D.addObject(view, root, 'actor', { ink: false, outline: false, castShadow: false, receiveShadows: false });
            const parts = {};
            for (const m of root.getChildMeshes(false)) { parts[m.metadata.part] = m; m.isPickable = false; }
            this.models[id] = { root, parts };
        };
        // нет файла — игра идёт без модели инструмента (стрижка работает и так)
        const skip = (e) => { console.warn('GameCut: нет модели инструмента', e); return null; };
        const [clipper, scissors, brush] = await Promise.all([
            Model3D.load('assets/models/gear/clipper.glb').catch(skip),
            Model3D.load('assets/models/gear/scissors.glb').catch(skip),
            Model3D.load('assets/models/gear/brush.glb').catch(skip),
        ]);
        if (clipper) add('clipper', clipper);
        if (scissors) add('scissors', scissors);
        if (brush) add('brush', brush);
    },

    // Перекрасить машинку (косметика магазина): палитра модели -> цвета предмета.
    skinClipper(colors) {
        const m = this.models.clipper;
        if (!m || !colors) return;
        GameFx.recolor(m.parts.Body, [['#23c4c9', colors[0]], ['#ff6b6b', colors[1]], ['#ffd23f', colors[2]]]);
    },

    start(opts) {
        const cust = opts.cust, ch = cust.char, view = ch.view;
        this.cust = cust; this.field = cust.field; this.clumps = opts.clumps; this.onFinish = opts.onFinish;
        this.view = view; this.scene = view.scene;
        this.active = true; this.phase = 'cut'; this.endT = 0;
        this.rage = 0; this.fled = false; this.calming = false;
        this.stats = { cut: 0, orbit: 0 };
        this.last = { progress: 0, stars: 0, over: 0, said: 0 };
        GameData.applyRequest(this.field, cust.data.request);
        ch.hair.setLod(true); ch.hair.showNeed = 1;
        // подсветка «срезать»: красная, а на красно-рыже-розовых волосах — синяя, иначе не видно
        const hv = GameFx.hsv(HairUtil.rgb(cust.data.spec.color));
        ch.hair.needCol = (hv[0] < 0.1 || hv[0] > 0.88) && hv[1] > 0.35 ? [0.16, 0.5, 1] : [1, 0.16, 0.12];
        // цель камеры — голова в покое
        const hp = ch.headWorld();
        this.center = hp.clone();
        this.floorY = -(hp.y - (opts.floorH || 0)) / CHAR_PX;
        this.clumps.floorY = this.floorY;
        this.clumps.colliders = [{ cx: 0, cy: 0, cz: 0, hx: HairHead.HB, hy: HairHead.HB, hz: HairHead.HB, r: HairHead.HR, body: true }].concat(CUT_BODY);
        // камера: спереди-сбоку от лица
        const fx = Math.cos(ch.heading), fz = Math.sin(ch.heading);
        this.faceYaw = Math.atan2(fx, fz);
        this.yaw = this.yawGoal = this.faceYaw + 0.55; this.pitch = this.pitchGoal = 0.16;
        this.distGoal = this.dist = this.baseDist();
        // инструменты — на узел головы
        for (const id in this.models) { const m = this.models[id]; m.root.parent = ch.headNode; m.root.setEnabled(false); }
        this.pos = [0.2, 0.5, 1.6]; this.prev = this.pos.slice(); this.vel = [0, 0, 0]; this.nrm = [0, 0, 1]; this.head = [0, 1, 0];
        this.ptr.down = false; this.ptr.mode = ''; this.ptr.inside = false; this.touches.clear();
        const req = cust.data.request;
        const toolOk = Game.toolUnlocked(req.tool) ? req.tool : 'clipper';
        this.selectTool(toolOk, true);
        this.selectGuard(req.guard && Game.guardUnlocked(req.guard) ? req.guard : 'g0', true);
        this.bind();
        ch.gaze = { x: 0, y: 0 };
        ch.setFace('worry');
        this.moodT = 2.5;
        this.say(Lang.t('g.req.' + req.id), 'neutral');
        this.sayT = 6;
        this.pushProgress(true);
    },

    stop() {
        if (!this.active) return;
        this.active = false;
        const ch = this.cust.char;
        for (const id in this.models) { const m = this.models[id]; m.root.setEnabled(false); m.root.parent = null; }
        if (ch.hair) { ch.hair.setLod(false); ch.hair.showNeed = 0; ch.hair.setTool(0, 0, 0, 0, 0); }
        ch.gaze = null; ch.headTilt = 0; ch.headNod = 0;
        this.field.clearTargets();
        this.clumps.glow = 0;
        // несметённое остаётся на накидке и тает — на следующего клиента не переходит
        for (let i = 0; i < this.clumps.n; i++) if (this.clumps.state[i] === 2) { this.clumps.state[i] = 4; this.clumps.rest[i] = 0; }
        this.stopLoops();
        this.ptr.down = false; this.touches.clear();
    },

    aspect() {
        const cv = this.scene.getEngine().getRenderingCanvas();
        return cv ? cv.clientWidth / Math.max(1, cv.clientHeight) : 1.6;
    },

    // Вертикальный угол обзора: на вертикальном экране шире, иначе голова не помещается по ширине.
    fov() { return Math.min(1.0, 0.72 + Math.max(0, 1 - this.aspect()) * 0.55); },

    // Дистанция, с которой голова с причёской помещается в кадр и по высоте, и по ширине.
    baseDist() {
        const base = typeof CUT_CAM_DIST !== 'undefined' ? CUT_CAM_DIST : 128;
        const v = this.fov(), h = 2 * Math.atan(Math.tan(v / 2) * this.aspect());
        return Math.max(base * Math.tan(0.36) / Math.tan(v / 2), 52 / Math.tan(h / 2));
    },

    // Поза камеры: { x, y, z, tx, ty, tz, fov }.
    pose(out) {
        const c = this.center, cp = Math.cos(this.pitch);
        out.tx = c.x; out.ty = c.y - 4; out.tz = c.z;
        let dx = Math.sin(this.yaw) * cp * this.dist, dy = Math.sin(this.pitch) * this.dist, dz = Math.cos(this.yaw) * cp * this.dist;
        // камера остаётся внутри комнаты: у стены она подъезжает ближе к голове
        const r = GameSalon.room, m = 26;
        let k = 1;
        if (dx < 0) k = Math.min(k, (r.x0 + m - c.x) / dx); else if (dx > 0) k = Math.min(k, (r.x1 - m - c.x) / dx);
        if (dz < 0) k = Math.min(k, (r.y0 + m - c.z) / dz); else if (dz > 0) k = Math.min(k, (r.y1 - m - c.z) / dz);
        if (dy > 0) k = Math.min(k, (r.H - 30 - c.y + 4) / dy);
        k = Math.max(0.3, k);
        out.x = c.x + dx * k; out.y = c.y - 4 + dy * k; out.z = c.z + dz * k;
        out.fov = this.fov();
        return out;
    },

    // --- выбор инструмента ---------------------------------------------------------------------

    selectTool(id, silent) {
        if (!Game.toolUnlocked(id)) { if (!silent) Sound.play('assets/sounds/ui-deny.ogg', { volume: 0.5 }); return; }
        if (this.phase === 'brush' && id !== 'brush') return;
        const was = this.tool;
        this.tool = id;
        for (const k in this.models) this.models[k].root.setEnabled(k === id && this.active);
        if (!silent) Sound.play('assets/sounds/ui-tab.ogg', { volume: 0.5 });
        if (id === 'clipper' && (was !== 'clipper' || silent)) Sound.play('assets/sounds/clipper-on.ogg', { volume: 0.5 });
        if (id !== 'clipper' && was === 'clipper' && !silent) Sound.play('assets/sounds/clipper-off.ogg', { volume: 0.45 });
        this.syncGuard();
        Game.emit('cut-tool', { tool: this.tool, guard: this.guard });
    },

    selectGuard(id, silent) {
        if (!Game.guardUnlocked(id)) { if (!silent) Sound.play('assets/sounds/ui-deny.ogg', { volume: 0.5 }); return; }
        this.guard = id;
        if (!silent) Sound.play('assets/sounds/ui-click.ogg', { volume: 0.5 });
        this.syncGuard();
        Game.emit('cut-tool', { tool: this.tool, guard: this.guard });
    },

    // Насадка на модели машинки: нет при «наголо», длиннее — крупнее.
    syncGuard() {
        const m = this.models.clipper;
        if (!m || !m.parts.Guard) return;
        const g = GameData.guard(this.guard);
        m.parts.Guard.setEnabled(g.len > 0);
        const k = 0.75 + g.len * 3.2;
        m.parts.Guard.scaling.set(k, k, 1);
    },

    rotate(dir) { this.rotHold = dir; },

    // --- ввод ----------------------------------------------------------------------------------

    bind() {
        if (this._bound) return;
        this._bound = true;
        const cv = /** @type {HTMLCanvasElement} */ (this.scene.getEngine().getRenderingCanvas());
        const local = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
        cv.addEventListener('pointerdown', (e) => {
            if (!this.active || Pause.active) return;
            const p = local(e);
            if (e.pointerType === 'touch') {
                this.touches.set(e.pointerId, p);
                if (this.touches.size === 2) { this.ptr.down = false; this.ptr.mode = 'pinch'; this.pinch = this.pinchDist(); return; }
                if (this.touches.size > 2) return;
            }
            const pt = this.ptr;
            pt.x = pt.lastX = p.x; pt.y = pt.lastY = p.y; pt.down = true; pt.id = e.pointerId; pt.inside = true; pt.button = e.button;
            const hit = e.button === 2 ? null : this.trace(p.x, p.y, 0.3, true);
            pt.mode = hit ? 'tool' : 'orbit';
            try { cv.setPointerCapture(e.pointerId); } catch (err) { /* нет захвата — не страшно */ }
            if (pt.mode === 'tool' && this.tool === 'scissors') this.snipT = 0;
        });
        cv.addEventListener('pointermove', (e) => {
            if (!this.active) return;
            const p = local(e), pt = this.ptr;
            if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
                const old = this.touches.get(e.pointerId);
                if (pt.mode === 'pinch' && this.touches.size >= 2) {
                    this.touches.set(e.pointerId, p);
                    const d = this.pinchDist();
                    if (this.pinch > 0 && d > 0) this.distGoal = HairUtil.clamp(this.distGoal * this.pinch / d, this.baseDist() * 0.62, this.baseDist() * 1.7);
                    this.pinch = d;
                    this.yawGoal -= (p.x - old.x) * 0.004; this.pitchGoal += (p.y - old.y) * 0.003;
                    return;
                }
                this.touches.set(e.pointerId, p);
            }
            if (pt.down && e.pointerId !== pt.id) return;
            if (pt.down && pt.mode === 'orbit') {
                const dx = p.x - pt.lastX, dy = p.y - pt.lastY;
                this.yawGoal -= dx * 0.0085; this.pitchGoal += dy * 0.006;
                this.stats.orbit += Math.abs(dx) * 0.0085;
            }
            pt.x = p.x; pt.y = p.y; pt.lastX = p.x; pt.lastY = p.y; pt.inside = true;
        });
        const up = (e) => {
            this.touches.delete(e.pointerId);
            if (this.ptr.mode === 'pinch' && this.touches.size < 2) this.ptr.mode = '';
            if (e.pointerId === this.ptr.id) { this.ptr.down = false; if (e.pointerType === 'touch') this.ptr.inside = false; }
        };
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', up);
        cv.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && !this.ptr.down) this.ptr.inside = false; });
        cv.addEventListener('wheel', (e) => {
            if (!this.active) return;
            this.distGoal = HairUtil.clamp(this.distGoal * (e.deltaY > 0 ? 1.1 : 0.9), this.baseDist() * 0.62, this.baseDist() * 1.7);
            e.preventDefault();
        }, { passive: false });
        window.addEventListener('lory-release-input', () => { this.ptr.down = false; this.touches.clear(); this.rotHold = 0; this.keys = {}; });
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            if (!this.active || Pause.active) return;
            this.keys[e.code] = true;
            if (e.code === 'Digit1') Game.cutSelectTool('clipper');
            else if (e.code === 'Digit2') Game.cutSelectTool('scissors');
            else if (e.code === 'Digit3') Game.cutSelectTool('brush');
        });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    },

    pinchDist() {
        const t = Array.from(this.touches.values());
        return t.length >= 2 ? Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y) : 0;
    },

    // Луч из точки экрана (CSS px канваса) по голове (и телу, если withBody), раздутым на offset.
    // -> { p: [x,y,z], n: [x,y,z], body } в системе головы или null.
    trace(px, py, offset, withBody) {
        const scene = this.scene, ch = this.cust.char;
        const ray = scene.createPickingRay(px, py, BABYLON.Matrix.Identity(), scene.activeCamera, false);
        const inv = this._inv || (this._inv = new BABYLON.Matrix());
        ch.headNode.computeWorldMatrix(true).invertToRef(inv);
        const o = BABYLON.Vector3.TransformCoordinates(ray.origin, inv);
        const d = BABYLON.Vector3.TransformNormal(ray.direction, inv); d.normalize();
        this._ro = o; this._rd = d;
        let t = 0;
        const g = [0, 0, 0];
        for (let i = 0; i < 56; i++) {
            const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
            let dist = HairHead.sdf(x, y, z) - offset, body = -1;
            if (withBody) {
                for (let b = 0; b < 2; b++) {
                    const c = CUT_BODY[b], db = this.sdBox(x, y, z, c) - offset;
                    if (db < dist) { dist = db; body = b; }
                }
            }
            if (dist < 0.004) {
                if (body >= 0) this.gradBox(x, y, z, CUT_BODY[body], g); else HairHead.grad(x, y, z, g);
                return { p: [x, y, z], n: [g[0], g[1], g[2]], body: body >= 0 };
            }
            t += Math.max(dist * 0.9, 0.006);
            if (t > 40) break;
        }
        return null;
    },

    sdBox(x, y, z, c) {
        const qx = Math.abs(x - c.cx) - (c.hx - c.r), qy = Math.abs(y - c.cy) - (c.hy - c.r), qz = Math.abs(z - c.cz) - (c.hz - c.r);
        const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
        return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - c.r;
    },

    gradBox(x, y, z, c, out) {
        const lx = x - c.cx, ly = y - c.cy, lz = z - c.cz;
        const qx = Math.abs(lx) - (c.hx - c.r), qy = Math.abs(ly) - (c.hy - c.r), qz = Math.abs(lz) - (c.hz - c.r);
        const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
        const l = Math.sqrt(mx * mx + my * my + mz * mz);
        const sx = lx < 0 ? -1 : 1, sy = ly < 0 ? -1 : 1, sz = lz < 0 ? -1 : 1;
        if (l > 1e-6) { out[0] = sx * mx / l; out[1] = sy * my / l; out[2] = sz * mz / l; }
        else if (qx > qy && qx > qz) { out[0] = sx; out[1] = 0; out[2] = 0; }
        else if (qy > qz) { out[0] = 0; out[1] = sy; out[2] = 0; }
        else { out[0] = 0; out[1] = 0; out[2] = sz; }
        return out;
    },

    // --- кадр ----------------------------------------------------------------------------------

    update(dt) {
        if (!this.active) return;
        const ch = this.cust.char, field = this.field, hair = ch.hair, pt = this.ptr, K = this.keys || {};
        // камера
        const rot = this.rotHold + (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
        if (rot) { this.yawGoal += rot * 2.0 * dt; this.stats.orbit += Math.abs(rot) * 2.0 * dt; }
        const pit = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0);
        if (pit) this.pitchGoal += pit * 1.2 * dt;
        this.pitchGoal = HairUtil.clamp(this.pitchGoal, -0.4, 1.25);
        const ck = 1 - Math.exp(-12 * dt);
        this.yaw += (this.yawGoal - this.yaw) * ck; this.pitch += (this.pitchGoal - this.pitch) * ck; this.dist += (this.distGoal - this.dist) * ck;

        // цель инструмента
        const offset = this.tool === 'scissors' ? 0.05 : this.tool === 'brush' ? 0.03 : 0.004;
        const useBody = this.tool === 'brush';
        let hit = null;
        if (pt.inside && pt.mode !== 'orbit' && pt.mode !== 'pinch') hit = this.trace(pt.x, pt.y, offset, useBody);
        else if (pt.inside && !pt.down) hit = this.trace(pt.x, pt.y, offset, useBody);
        const tp = this._tp || (this._tp = [0, 0, 0]), tn = this._tn || (this._tn = [0, 0, 1]);
        if (hit) { tp[0] = hit.p[0]; tp[1] = hit.p[1]; tp[2] = hit.p[2]; tn[0] = hit.n[0]; tn[1] = hit.n[1]; tn[2] = hit.n[2]; }
        else if (this._rd && pt.inside) {
            // вне головы: инструмент висит на луче у головы, развёрнут к камере
            const o = this._ro, d = this._rd, tt = Math.max(0.3, -(o.x * d.x + o.y * d.y + o.z * d.z) - 0.25);
            tp[0] = o.x + d.x * tt; tp[1] = o.y + d.y * tt; tp[2] = o.z + d.z * tt;
            tn[0] = -d.x; tn[1] = -d.y; tn[2] = -d.z;
        }
        this.onSurface = !!hit; this.onBody = !!(hit && hit.body);
        const pressed = pt.down && pt.mode === 'tool' && this.phase !== 'end';

        // «пружина»: инструмент догоняет указатель, нормаль и курс сглажены
        const pos = this.pos, prev = this.prev, vel = this.vel, nrm = this.nrm, head = this.head;
        prev[0] = pos[0]; prev[1] = pos[1]; prev[2] = pos[2];
        const fk = 1 - Math.exp(-(pressed ? 26 : 16) * dt);
        pos[0] += (tp[0] - pos[0]) * fk; pos[1] += (tp[1] - pos[1]) * fk; pos[2] += (tp[2] - pos[2]) * fk;
        const idt = dt > 1e-4 ? 1 / dt : 0;
        vel[0] = (pos[0] - prev[0]) * idt; vel[1] = (pos[1] - prev[1]) * idt; vel[2] = (pos[2] - prev[2]) * idt;
        const nk = 1 - Math.exp(-16 * dt);
        nrm[0] += (tn[0] - nrm[0]) * nk; nrm[1] += (tn[1] - nrm[1]) * nk; nrm[2] += (tn[2] - nrm[2]) * nk;
        let nl = Math.hypot(nrm[0], nrm[1], nrm[2]) || 1; nrm[0] /= nl; nrm[1] /= nl; nrm[2] /= nl;
        // курс — по ходу движения (в касательной плоскости)
        const vn = vel[0] * nrm[0] + vel[1] * nrm[1] + vel[2] * nrm[2];
        let hx = vel[0] - nrm[0] * vn, hy = vel[1] - nrm[1] * vn, hz = vel[2] - nrm[2] * vn;
        const speed = Math.hypot(hx, hy, hz);
        if (speed > 0.35) {
            const hk = 1 - Math.exp(-Math.min(14, speed * 5) * dt);
            head[0] += (hx / speed - head[0]) * hk; head[1] += (hy / speed - head[1]) * hk; head[2] += (hz / speed - head[2]) * hk;
        }
        const hn = head[0] * nrm[0] + head[1] * nrm[1] + head[2] * nrm[2];
        head[0] -= nrm[0] * hn; head[1] -= nrm[1] * hn; head[2] -= nrm[2] * hn;
        nl = Math.hypot(head[0], head[1], head[2]);
        if (nl < 1e-3) { head[0] = 0; head[1] = 1; head[2] = 0; if (Math.abs(nrm[1]) > 0.9) { head[1] = 0; head[2] = -1; } nl = 1; }
        head[0] /= nl; head[1] /= nl; head[2] /= nl;

        this.cutRate *= Math.exp(-6 * dt);
        if (this.phase !== 'end') {
            if (this.tool === 'clipper') this.useClipper(dt, pressed);
            else if (this.tool === 'scissors') this.useScissors(dt, pressed);
            else this.useBrush(dt, pressed, speed);
        }
        this.placeTool(dt, pressed);

        // волосы раздвигаются у инструмента, за ним тянется затухающий след
        if (hair) {
            const near = this.onSurface && !this.onBody;
            hair.setTool(pos[0], pos[1], pos[2], near ? 0.3 : 0.0001, near ? (pressed ? 0.11 : 0.06) : 0);
            if (near) {
                this.wakeD += speed * dt;
                if (this.wakeD > 0.16 && speed > 0.5) {
                    this.wakeD = 0;
                    const a = Math.min(0.16, speed * 0.035);
                    hair.addPush(pos[0], pos[1], pos[2], hx / speed * a, hy / speed * a, hz / speed * a, 0.42);
                }
            }
        }
        this.spawnClumps();
        this.clumps.update(dt);
        this.react(dt, pressed);
        this.autoOrbit(dt, pressed);
        this.sound(dt, pressed);

        this.scoreT -= dt;
        if (this.scoreT <= 0) { this.scoreT = 0.12; this.pushProgress(false); }
        if (this.phase === 'end') { this.endT -= dt; if (this.endT <= 0) this.finish(); }
    },

    useClipper(dt, pressed) {
        if (!pressed || !this.onSurface || this.onBody) { this._cutPrev = null; return; }
        const pos = this.pos, h = this.head, g = GameData.guard(this.guard), field = this.field;
        const from = this._cutPrev || pos;
        const dx = pos[0] - from[0], dy = pos[1] - from[1], dz = pos[2] - from[2];
        const steps = Math.min(8, Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / 0.04)));
        const gr = this._gr || (this._gr = [0, 0, 0]);
        let cut = 0;
        for (let s = 1; s <= steps; s++) {
            const k = s / steps;
            let x = from[0] + dx * k, y = from[1] + dy * k, z = from[2] + dz * k;
            const d = HairHead.sdf(x, y, z); HairHead.grad(x, y, z, gr);
            x -= gr[0] * d; y -= gr[1] * d; z -= gr[2] * d;
            // курс ножа в касательной плоскости этой точки
            const hn = h[0] * gr[0] + h[1] * gr[1] + h[2] * gr[2];
            let ax = h[0] - gr[0] * hn, ay = h[1] - gr[1] * hn, az = h[2] - gr[2] * hn;
            const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al;
            cut += field.cutClipper(x, y, z, gr[0], gr[1], gr[2], ax, ay, az, 0.165, 0.075, g.len);
        }
        this._cutPrev = this._cutPrev || [0, 0, 0];
        this._cutPrev[0] = pos[0]; this._cutPrev[1] = pos[1]; this._cutPrev[2] = pos[2];
        if (cut > 0) { this.cutRate += cut; this.stats.cut += cut; }
    },

    useScissors(dt, pressed) {
        this.snipAnim = Math.max(0, this.snipAnim - dt * 5.5);
        if (!pressed || !this.onSurface || this.onBody) return;
        this.snipT -= dt;
        if (this.snipT > 0) return;
        this.snipT = 0.24;
        this.snipAnim = 1;
        const p = this.pos, h = this.head, n = this.nrm;
        // лезвия: от винта вперёд по курсу, чуть над кожей
        const ax = p[0] - h[0] * 0.26 + n[0] * 0.02, ay = p[1] - h[1] * 0.26 + n[1] * 0.02, az = p[2] - h[2] * 0.26 + n[2] * 0.02;
        const bx = p[0] + h[0] * 0.34 + n[0] * 0.02, by = p[1] + h[1] * 0.34 + n[1] * 0.02, bz = p[2] + h[2] * 0.34 + n[2] * 0.02;
        const cut = this.field.cutCapsule(ax, ay, az, bx, by, bz, 0.095, 0.05);
        Sound.play(['assets/sounds/snip-1.ogg', 'assets/sounds/snip-2.ogg', 'assets/sounds/snip-3.ogg', 'assets/sounds/snip-4.ogg'], { volume: 0.55 });
        if (cut > 0) { this.cutRate += cut * 0.6; this.stats.cut += cut; }
        if (this.cust.char.hair) this.cust.char.hair.addPush(p[0], p[1], p[2], n[0] * 0.05, n[1] * 0.05, n[2] * 0.05, 0.4);
        Game.emit('fx', { type: 'snip', pos: this.toolWorld() });
    },

    useBrush(dt, pressed, speed) {
        if (!pressed || !this.onSurface) return;
        const p = this.pos, v = this.vel;
        const n = this.clumps.brush(p[0], p[1], p[2], 0.6, v[0], v[1], v[2]);
        this.brushSndT -= dt;
        if ((n > 0 || speed > 2.2) && this.brushSndT <= 0) {
            this.brushSndT = 0.22;
            Sound.play(['assets/sounds/brush-1.ogg', 'assets/sounds/brush-2.ogg', 'assets/sounds/brush-3.ogg'], { volume: n > 0 ? 0.55 : 0.28 });
        }
        if (n > 0) Game.emit('fx', { type: 'brush', pos: this.toolWorld(), n });
    },

    // Положение и поворот модели инструмента.
    placeTool(dt, pressed) {
        const m = this.models[this.tool];
        if (!m) return;
        m.root.setEnabled(this.ptr.inside || this.ptr.down);
        const p = this.pos, n = this.nrm, h = this.head;
        let tilt = 0.42, lift = 0.012, back = 0;
        const X = this._X || (this._X = new BABYLON.Vector3()), Y = this._Y || (this._Y = new BABYLON.Vector3()), Z = this._Z || (this._Z = new BABYLON.Vector3());
        if (this.tool === 'clipper') {
            // мелкая дрожь работающей машинки
            const j = Math.sin(performance.now() * 0.38) * 0.004;
            lift = 0.012 + j; tilt = 0.4;
            X.set(h[0] * Math.cos(tilt) - n[0] * Math.sin(tilt), h[1] * Math.cos(tilt) - n[1] * Math.sin(tilt), h[2] * Math.cos(tilt) - n[2] * Math.sin(tilt));
            Y.set(n[0] * Math.cos(tilt) + h[0] * Math.sin(tilt), n[1] * Math.cos(tilt) + h[1] * Math.sin(tilt), n[2] * Math.cos(tilt) + h[2] * Math.sin(tilt));
        } else if (this.tool === 'scissors') {
            tilt = 0.1; lift = 0.03; back = 0.26;
            X.set(h[0] * Math.cos(tilt) - n[0] * Math.sin(tilt), h[1] * Math.cos(tilt) - n[1] * Math.sin(tilt), h[2] * Math.cos(tilt) - n[2] * Math.sin(tilt));
            Y.set(n[0] * Math.cos(tilt) + h[0] * Math.sin(tilt), n[1] * Math.cos(tilt) + h[1] * Math.sin(tilt), n[2] * Math.cos(tilt) + h[2] * Math.sin(tilt));
            const open = 0.34 * (1 - this.snipAnim) + (pressed ? 0 : 0.08);
            if (m.parts.BladeA) m.parts.BladeA.rotation.y = open;
            if (m.parts.BladeB) m.parts.BladeB.rotation.y = -open;
        } else {
            // щётка: щетиной к поверхности, с наклоном по ходу
            tilt = 0.95; lift = 0.02;
            X.set(-n[0] * Math.sin(tilt) + h[0] * Math.cos(tilt), -n[1] * Math.sin(tilt) + h[1] * Math.cos(tilt), -n[2] * Math.sin(tilt) + h[2] * Math.cos(tilt));
            Y.set(n[0] * Math.cos(tilt) + h[0] * Math.sin(tilt), n[1] * Math.cos(tilt) + h[1] * Math.sin(tilt), n[2] * Math.cos(tilt) + h[2] * Math.sin(tilt));
        }
        BABYLON.Vector3.CrossToRef(X, Y, Z);
        const q = m.root.rotationQuaternion || (m.root.rotationQuaternion = new BABYLON.Quaternion());
        BABYLON.Quaternion.RotationQuaternionFromAxisToRef(X, Y, Z, q);
        m.root.position.set(p[0] + n[0] * lift - h[0] * back, p[1] + n[1] * lift - h[1] * back, p[2] + n[2] * lift - h[2] * back);
    },

    // Мировая точка инструмента (для эффектов).
    toolWorld() {
        const ch = this.cust.char, p = this.pos;
        return BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(p[0], p[1], p[2]), ch.headNode.getWorldMatrix());
    },

    // Срезы поля -> падающие клочки.
    spawnClumps() {
        const ev = this.field.events;
        if (!ev.length) return;
        const v = this.vel;
        for (let i = 0; i < ev.length; i += 7) {
            const x = ev[i], y = ev[i + 1], z = ev[i + 2], amt = ev[i + 3];
            const l = Math.hypot(x, y, z) || 1, out = 0.5 + Math.random() * 0.9;
            this.clumps.spawn(x, y, z,
                x / l * out + v[0] * 0.22 + (Math.random() - 0.5) * 0.5,
                y / l * out + 0.6 + v[1] * 0.15 + Math.random() * 0.6,
                z / l * out + v[2] * 0.22 + (Math.random() - 0.5) * 0.5,
                ev[i + 4], ev[i + 5], ev[i + 6], 0.8 + amt * 1.0, Math.random() < 0.085);
        }
        Game.emit('fx', { type: 'cut', pos: this.toolWorld(), n: ev.length / 7 });
        ev.length = 0;
    },

    // Камера сама доворачивается, когда инструмент уходит за край видимой стороны головы.
    autoOrbit(dt, pressed) {
        if (!pressed || !this.onSurface || this.onBody) return;
        const ch = this.cust.char, n = this.nrm;
        const w = BABYLON.Vector3.TransformNormal(new BABYLON.Vector3(n[0], n[1], n[2]), ch.headNode.getWorldMatrix()); w.normalize();
        const cp = Math.cos(this.pitch);
        const cx = Math.sin(this.yaw) * cp, cy = Math.sin(this.pitch), cz = Math.cos(this.yaw) * cp;
        const d = w.x * cx + w.y * cy + w.z * cz;
        if (d > 0.52) return;
        const k = (0.52 - d) * 3.2 * dt;
        if (Math.hypot(w.x, w.z) > 0.25) {
            let diff = Math.atan2(w.x, w.z) - this.yawGoal;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            this.yawGoal += HairUtil.clamp(diff, -1.2, 1.2) * k;
            this.stats.orbit += Math.abs(HairUtil.clamp(diff, -1.2, 1.2) * k) * 0.5;
        }
        this.pitchGoal += (Math.asin(HairUtil.clamp(w.y, -1, 1)) * 0.75 - this.pitchGoal) * k;
    },

    // --- реакции клиента -------------------------------------------------------------------------

    say(text, mood) { Game.emit('cut-say', { text, mood: mood || 'neutral' }); this.sayT = 4.5; },

    react(dt, pressed) {
        const ch = this.cust.char, p = this.pos;
        // взгляд следит за инструментом, пока тот перед лицом
        if (ch.gaze) {
            if (p[2] > 0.1 && this.ptr.inside) { ch.gaze.x = HairUtil.clamp(p[0] / 0.7, -1, 1); ch.gaze.y = HairUtil.clamp((p[1] - 0.14) / 0.6, -1, 1); }
            else { ch.gaze.x *= 0.96; ch.gaze.y *= 0.96; }
        }
        // голова чуть уклоняется от давящего инструмента
        const press = pressed && this.onSurface && !this.onBody ? 1 : 0;
        ch.headTilt = -HairUtil.clamp(p[0], -1, 1) * 0.07 * press;
        ch.headNod = (p[2] > 0 ? 0.05 : -0.06) * press * (p[1] > 0.3 ? 1 : 0.4);
        this.sayT -= dt; this.eyeT -= dt; this.moodT -= dt;
        // машинка у самых глаз
        if (press && this.tool !== 'brush' && p[2] > 0.5 && Math.abs(p[1] - 0.14) < 0.26 && Math.abs(p[0]) < 0.5 && this.eyeT <= 0) {
            this.eyeT = 5; this.moodT = 1.6;
            this.addRage(0.08);
            ch.setFace('scared'); ch.hair && ch.hair.kick(0, 0.5, -0.6);
            Sound.play(['assets/sounds/voice-worry-1.ogg', 'assets/sounds/voice-worry-2.ogg'], { volume: 0.6 });
            this.say(GameData.line('g.eyes'), 'worry');
        }
        if (this.moodT <= 0 && this.phase !== 'end') {
            const pr = this.last.progress, want = pr > 0.85 ? 'happy' : pr > 0.4 ? 'smile' : 'neutral';
            if (ch.face !== want) ch.setFace(want);
            this.moodT = 0.5;
        }
    },

    // Оценка и события для шкалы.
    pushProgress(force) {
        const sc = this.field.score(), L = this.last;
        const stars = sc.progress >= 0.95 ? 3 : sc.progress >= 0.8 ? 2 : sc.progress >= 0.55 ? 1 : 0;
        const body = this.clumps.counts().body;
        const ch = this.cust.char;
        if (sc.over > L.over + 0.012) {
            // срезано лишнее
            this.addRage(0.03 + (sc.over - L.over) * 1.6);
            L.over = sc.over; this.moodT = 1.8;
            ch.setFace('angry'); ch.hair && ch.hair.kick((Math.random() - 0.5) * 1.6, 0.4, 0);
            Sound.play(['assets/sounds/voice-angry-1.ogg', 'assets/sounds/voice-angry-2.ogg'], { volume: 0.6 });
            this.say(GameData.line('g.over'), 'angry');
            Game.emit('fx', { type: 'oops', pos: this.toolWorld() });
        } else if (this.phase === 'cut' && this.sayT <= 0) {
            if (L.said < 1 && sc.progress > 0.35) { L.said = 1; this.say(GameData.line('g.mid'), 'happy'); Sound.play(['assets/sounds/voice-happy-1.ogg', 'assets/sounds/voice-happy-2.ogg', 'assets/sounds/voice-happy-3.ogg'], { volume: 0.5 }); }
            else if (L.said < 2 && sc.progress > 0.8) { L.said = 2; this.say(GameData.line('g.near'), 'happy'); Sound.play(['assets/sounds/voice-happy-1.ogg', 'assets/sounds/voice-happy-2.ogg', 'assets/sounds/voice-happy-3.ogg'], { volume: 0.5 }); }
        }
        if (stars > L.stars) { Game.emit('fx', { type: 'star', n: stars }); Sound.play(stars === 1 ? 'assets/sounds/star-1.ogg' : stars === 2 ? 'assets/sounds/star-2.ogg' : 'assets/sounds/star-3.ogg', { volume: 0.6 }); }
        L.progress = sc.progress; L.stars = stars;
        Game.emit('cut-progress', { progress: sc.progress, stars, phase: this.phase === 'end' ? 'brush' : this.phase, clumps: body, need: sc.need, over: sc.over,
            rage: this.rage, canCalm: this.rage >= 0.5 && !this.calming && Platform.rewardedSupported() && Platform.rewardedReady() });
        if (this.phase === 'brush' && body <= 0) { this.phase = 'end'; this.endT = 0.5; }
    },

    // Грубая ошибка: ярость растёт; шкала заполнена — клиент вскакивает и убегает.
    addRage(v) {
        if (!this.active || this.phase === 'end') return;
        this.rage = Math.min(1, this.rage + v);
        Game.emit('fx', { type: 'oops', pos: this.toolWorld() });
        if (this.rage >= 1) {
            this.fled = true; this.phase = 'end'; this.endT = 0.9; this.moodT = 9;
            const ch = this.cust.char;
            ch.setFace('angry'); ch.hair && ch.hair.kick(0, 1.4, 0);
            Sound.play(['assets/sounds/voice-angry-1.ogg', 'assets/sounds/voice-angry-2.ogg'], { volume: 0.7 });
            this.say(GameData.line('g.fled'), 'angry');
            Game.shake(2.4, 0.35);
        }
        this.scoreT = 0;
    },

    // «Успокоить за рекламу»: награда только по подтверждению площадки.
    async calm() {
        if (!this.active || this.calming || this.phase === 'end' || this.rage < 0.5) return false;
        this.calming = true;
        let ok = false;
        try { ok = await Platform.rewarded('calm-client'); } catch (e) { ok = false; }
        this.calming = false;
        if (ok && this.active && this.phase !== 'end') {
            this.rage = Math.max(0, this.rage - 0.6);
            this.cust.char.setFace('smile'); this.moodT = 1.5;
            this.say(GameData.line('g.calmed'), 'happy');
            Sound.play(['assets/sounds/voice-happy-1.ogg', 'assets/sounds/voice-happy-2.ogg', 'assets/sounds/voice-happy-3.ogg'], { volume: 0.5 });
        }
        this.scoreT = 0;
        return ok;
    },

    // Кнопка «Готово».
    done() {
        if (!this.active || this.phase === 'end') return;
        const body = this.clumps.counts().body;
        if (this.phase === 'cut' && body > 0 && Game.toolUnlocked('brush')) {
            this.phase = 'brush';
            this.clumps.glow = 1;                                    // жёлтым — что смести
            this.field.clearTargets();
            this.cust.char.hair.showNeed = 0;
            this.selectTool('brush', true);
            this.say(GameData.line('g.brush'), 'neutral');
            this.pushProgress(true);
            return;
        }
        this.phase = 'end'; this.endT = 0.15;
    },

    finish() {
        if (!this.active) return;
        const L = this.last, body = this.clumps.counts().body;
        const res = { stars: this.fled ? 0 : L.stars, progress: L.progress, over: L.over, left: body, clean: !this.fled && body <= 1, fled: this.fled };
        const fn = this.onFinish;
        this.stop();
        Game.emit('cut-end', {});
        if (fn) fn(res);
    },

    // --- звук ------------------------------------------------------------------------------------

    sound(dt, pressed) {
        const clip = this.tool === 'clipper' && this.phase !== 'end';
        if (clip) {
            if (!this.loopBuzz) this.loopBuzz = Sound.loop('assets/sounds/clipper-loop.ogg', { volume: 0.0, rate: 1 });
            const load = Math.min(1, this.cutRate * 0.5);
            this.loopBuzz.set(pressed ? 0.34 + load * 0.1 : 0.14, 1 - load * 0.09 + (pressed ? 0.02 : 0));
            if (!this.loopCrunch) this.loopCrunch = Sound.loop('assets/sounds/hair-crunch-loop.ogg', { volume: 0.0, rate: 1 });
            this.loopCrunch.set(Math.min(0.6, load * 0.8), 0.9 + load * 0.25);
        } else this.stopLoops();
    },

    stopLoops() {
        if (this.loopBuzz) { this.loopBuzz.fade(0.15); this.loopBuzz = null; }
        if (this.loopCrunch) { this.loopCrunch.fade(0.15); this.loopCrunch = null; }
    },
};
