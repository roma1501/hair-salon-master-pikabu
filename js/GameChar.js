// GameChar.js — персонаж игры: блочный человечек на базе аватара из проекта Steal a Dragon Egg
// (те же пропорции CH, раскраска «игрушечной» тенью, лицо с живыми глазами), перенесённый на
// Babylon. Голова — скруглённый куб HairHead: на ней растут пряди HairView.
//
//   GameGeo    — сборка мешей из массивов с нужным обходом треугольников, коробка с UV-атласом.
//   SalonChar  — персонаж: корень (px карты), тело в единицах базы (CHAR_PX px на единицу),
//                позы stand / sit / walk / sweep / cheer, лицо и эмоции, накидка, причёска.

const CHAR_PX = 29;       // px мира на единицу персонажа-базы (рост ≈ 6.5 ед. ≈ 188 px)
const CH = {
    legW: 1.0, legH: 2.4, hipX: 0.52,
    torsoW: 2.1, torsoH: 2.3, torsoD: 1.05,
    armW: 0.95, armH: 2.3, shoulderX: 1.555, shoulderY: 4.65,
    head: 1.5, headY: 5.47,
    torsoY: 2.4 + 2.3 / 2,
};

/** @satisfies {Record<string, any>} */
const GameGeo = {
    _flip: null,

    // Обход треугольников сцены: сверяемся с коробкой Babylon (у неё он заведомо верный).
    flip() {
        if (this._flip != null) return this._flip;
        const vd = BABYLON.CreateBoxVertexData({ size: 1 });
        const p = vd.positions, n = vd.normals, ix = vd.indices;
        const a = ix[0] * 3, b = ix[1] * 3, c = ix[2] * 3;
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        const d = (uy * vz - uz * vy) * n[a] + (uz * vx - ux * vz) * n[a + 1] + (ux * vy - uy * vx) * n[a + 2];
        this._flip = d < 0;      // наши данные — против часовой снаружи; у Babylon иначе — переворачиваем
        return this._flip;
    },

    // Меш из массивов (треугольники — против часовой, если смотреть снаружи). data.orient выправляет
    // обход сам: 'normals' — по нормалям вершин, 'axisY' — наружу от вертикальной оси.
    mesh(scene, name, data) {
        const idx = data.indices.slice();
        if (data.orient) {
            const p = data.positions, nr = data.normals;
            for (let i = 0; i < idx.length; i += 3) {
                const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
                const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
                const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
                const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
                let rx, ry, rz;
                if (data.orient === 'axisY') { rx = p[a] + p[b] + p[c]; ry = 0; rz = p[a + 2] + p[b + 2] + p[c + 2]; }
                else { rx = nr[a] + nr[b] + nr[c]; ry = nr[a + 1] + nr[b + 1] + nr[c + 1]; rz = nr[a + 2] + nr[b + 2] + nr[c + 2]; }
                if (gx * rx + gy * ry + gz * rz < 0) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
            }
        }
        if (this.flip()) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
        const vd = new BABYLON.VertexData();
        vd.positions = data.positions; vd.indices = idx;
        if (data.normals) vd.normals = data.normals;
        else { const nr = []; BABYLON.VertexData.ComputeNormals(data.positions, idx, nr); vd.normals = nr; }
        if (data.uvs) vd.uvs = data.uvs;
        if (data.colors) vd.colors = data.colors;
        const m = new BABYLON.Mesh(name, scene);
        vd.applyToMesh(m, !!data.updatable);
        return m;
    },

    // Коробка w×h×d с центром (0, cy, 0). regions — прямоугольники атласа [x, y, w, h] в px холста
    // W×H по граням { px, nx, py, ny, pz, nz } (как CHAR_UV базы); без regions — UV 0..1 на грань.
    box(w, h, d, regions, W, H, cy) {
        const x = w / 2, y = h / 2, z = d / 2, oy = cy || 0;
        // грань: 4 угла (низ-лево, низ-право, верх-право, верх-лево при взгляде снаружи), нормаль
        const faces = [
            ['px', [x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0]],
            ['nx', [-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0]],
            ['py', [-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], [0, 1, 0]],
            ['ny', [-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, -1, 0]],
            ['pz', [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
            ['nz', [x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
        ];
        const positions = [], normals = [], uvs = [], indices = [];
        for (const f of faces) {
            const base = positions.length / 3;
            const r = regions ? regions[/** @type {string} */ (f[0])] : null;
            const u0 = r ? (r[0] + 1) / W : 0, u1 = r ? (r[0] + r[2] - 1) / W : 1;
            const v0 = r ? 1 - (r[1] + r[3] - 1) / H : 0, v1 = r ? 1 - (r[1] + 1) / H : 1;
            const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
            for (let k = 0; k < 4; k++) {
                const p = /** @type {number[]} */ (f[k + 1]), nn = /** @type {number[]} */ (f[5]);
                positions.push(p[0], p[1] + oy, p[2]); normals.push(nn[0], nn[1], nn[2]); uvs.push(uv[k][0], uv[k][1]);
            }
            indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
        return { positions, normals, uvs, indices };
    },

    shade(hex, f) {
        const c = HairUtil.rgb(hex);
        const k = (v) => Math.round(HairUtil.clamp(v + f, 0, 1) * 255).toString(16).padStart(2, '0');
        return '#' + k(c[0]) + k(c[1]) + k(c[2]);
    },
};

// Раскладки текстур — как CHAR_UV базы: туловище 256×256 (перед, спина, бока, верх, низ), конечности 64×128.
const CHAR_UV = {
    shirt: { W: 256, H: 256, pz: [0, 0, 128, 128], nz: [128, 0, 128, 128], px: [0, 128, 64, 128], nx: [64, 128, 64, 128], py: [128, 128, 128, 64], ny: [128, 192, 128, 64] },
    limb: { W: 64, H: 128, px: [0, 0, 64, 128], nx: [0, 0, 64, 128], pz: [0, 0, 64, 128], nz: [0, 0, 64, 128], py: [6, 1, 52, 6], ny: [6, 121, 52, 6] },
};

const CHAR_SKINS = ['#ffd9b0', '#f6c79a', '#e8b282', '#c98d5e', '#a06a44', '#7b4c30', '#ffe2c6'];
const CHAR_FACES = ['smile', 'happy', 'worry', 'scared', 'angry', 'wow', 'neutral'];

class SalonChar {
    // view — View3D локации; look: { skin, shirt, undershirt?, pants, shoes?, sole?, apron? }
    constructor(view, look) {
        const scene = view.scene;
        this.view = view; this.scene = scene;
        this.look = Object.assign({ skin: '#ffd9b0', shirt: '#2f6fd6', undershirt: null, pants: '#2a3550', shoes: '#30343a', sole: '#f4f1e8' }, look || {});
        this.x = 0; this.y = 0; this.h = 0; this.heading = 0;
        this.t = Math.random() * 6; this.time = Math.random() * 6;
        this.pose = 'stand';
        this.moving = false;
        this.face = 'smile';
        this.celebrateT = 0;
        this.eye = { x: 0, y: 0, tx: 0, ty: 0, blink: 1, nextLook: 0.4 + Math.random(), nextBlink: 1 + Math.random() * 3, bt: 0, wide: 1 };
        /** цель взгляда в координатах лица (−1..1) или null — глаза гуляют сами */
        this.gaze = null;
        /** @type {HairView | null} */
        this.hair = null;
        /** @type {BABYLON.Mesh | null} */
        this.cape = null;
        this.headTilt = 0; this.headNod = 0;     // добавочные наклоны головы (реакции клиента)
        this._mats = [];

        const root = new BABYLON.Mesh('char', scene);
        root.scaling.setAll(CHAR_PX);
        const body = new BABYLON.Mesh('char-body', scene); body.parent = root;
        this.root = root; this.body = body;

        const tex = this._paintOutfit();
        const mk = (name, canvasTex) => {
            const m = new BABYLON.StandardMaterial(name, scene);
            m.diffuseTexture = canvasTex; m.specularColor = new BABYLON.Color3(0, 0, 0);
            this._mats.push(m);
            return m;
        };
        const S = CHAR_UV.shirt, Lm = CHAR_UV.limb;
        const torsoNode = new BABYLON.Mesh('char-torso-node', scene); torsoNode.parent = body; torsoNode.position.y = CH.torsoY;
        const torso = GameGeo.mesh(scene, 'char-torso', GameGeo.box(CH.torsoW, CH.torsoH, CH.torsoD, S, S.W, S.H, 0));
        torso.parent = torsoNode; torso.material = mk('char-torso-mat', tex.torso);
        this.torsoNode = torsoNode; this.torso = torso;

        const armMat = mk('char-arm-mat', tex.arm), legMat = mk('char-leg-mat', tex.leg);
        const limb = (name, x, y, w, h, mat) => {
            const pivot = new BABYLON.Mesh(name + '-pivot', scene); pivot.parent = body; pivot.position.set(x, y, 0);
            const mesh = GameGeo.mesh(scene, name, GameGeo.box(w, h, w, Lm, Lm.W, Lm.H, -h / 2));
            mesh.parent = pivot; mesh.material = mat;
            return pivot;
        };
        this.armL = limb('char-armL', -CH.shoulderX, CH.shoulderY, CH.armW, CH.armH, armMat);
        this.armR = limb('char-armR', CH.shoulderX, CH.shoulderY, CH.armW, CH.armH, armMat);
        // нога короче на высоту ботинка: её нижняя грань прячется внутри него (иначе грани мерцают)
        this.legL = limb('char-legL', -CH.hipX, CH.legH, CH.legW, CH.legH - 0.34, legMat);
        this.legR = limb('char-legR', CH.hipX, CH.legH, CH.legW, CH.legH - 0.34, legMat);
        // ботинки
        const shoeMat = new BABYLON.StandardMaterial('char-shoe-mat', scene);
        shoeMat.specularColor = new BABYLON.Color3(0, 0, 0); this._mats.push(shoeMat);
        for (const leg of [this.legL, this.legR]) {
            const up = GameGeo.box(1.16, 0.4, 1.34, null, 1, 1, 0.32), so = GameGeo.box(1.24, 0.16, 1.44, null, 1, 1, 0.08);
            const cu = HairUtil.rgb(this.look.shoes), cs = HairUtil.rgb(this.look.sole);
            const colors = [];
            for (let i = 0; i < 24; i++) colors.push(cu[0], cu[1], cu[2], 1);
            for (let i = 0; i < 24; i++) colors.push(cs[0], cs[1], cs[2], 1);
            const pos = up.positions.concat(so.positions), nor = up.normals.concat(so.normals);
            for (let i = 2; i < pos.length; i += 3) pos[i] += 0.1;
            const idx = up.indices.concat(so.indices.map(v => v + 24));
            const shoe = GameGeo.mesh(scene, 'char-shoe', { positions: pos, normals: nor, indices: idx, colors });
            shoe.parent = leg; shoe.position.y = -CH.legH; shoe.material = shoeMat;
        }

        // голова: скруглённый куб с цветом в вершинах (кожа + тень щетины там, где растут волосы)
        const headNode = new BABYLON.Mesh('char-head-node', scene); headNode.parent = body; headNode.position.y = CH.headY;
        this.headNode = headNode;
        this.head = SalonChar.headMesh(scene, this.look.skin, null, false);
        this.head.parent = headNode;
        const headMat = new BABYLON.StandardMaterial('char-head-mat', scene);
        headMat.specularColor = new BABYLON.Color3(0, 0, 0); this._mats.push(headMat);
        this.head.material = headMat;
        // лицо — прозрачная накладка с румянцем, ртом и бровями
        this.faceTex = new BABYLON.DynamicTexture('char-face', { width: 256, height: 256 }, scene, true);
        this.faceTex.hasAlpha = true;
        const faceMat = new BABYLON.StandardMaterial('char-face-mat', scene);
        faceMat.diffuseColor = new BABYLON.Color3(0, 0, 0); faceMat.specularColor = new BABYLON.Color3(0, 0, 0);
        faceMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
        faceMat.emissiveTexture = this.faceTex; faceMat.opacityTexture = this.faceTex;
        faceMat.disableLighting = true; faceMat.zOffset = -2; faceMat.metadata = { toon: false };
        this._mats.push(faceMat);
        this.faceMesh = SalonChar.faceMesh(scene); this.faceMesh.parent = headNode; this.faceMesh.material = faceMat;
        this.faceMesh.isPickable = false;
        // глаза — отдельные меши: смотрят по сторонам, моргают
        const eyeMat = SalonChar.eyeMaterial(scene);
        this.eyes = [];
        for (const sx of [-1, 1]) {
            const e = SalonChar.eyeMesh(scene);
            e.parent = headNode; e.material = eyeMat;
            e.position.set(sx * 0.234, 0.14, HairHead.HB + 0.006);
            e.metadata = { restX: e.position.x, restY: e.position.y };
            this.eyes.push(e);
        }
        this.setFace('smile');

        World3D.addObject(view, root, 'actor', { ink: false, outline: false });
        for (const e of this.eyes) e.receiveShadows = false;
        this.faceMesh.receiveShadows = false;
        this.place(0, 0, 0, 0);
    }

    // --- геометрия головы и лица (общая форма HairHead) -------------------------------------

    // Скруглённая голова. skin — цвет кожи, hairHex — цвет щетины (или null), beard — щетина бороды.
    static headMesh(scene, skin, hairHex, beard) {
        const N = 22, HB = HairHead.HB, out = [0, 0, 0, 0, 0, 0];
        const positions = [], normals = [], indices = [], colors = [];
        for (let face = 0; face < 6; face++) {
            const s = face & 1 ? HB : -HB, ax = face >> 1, base = positions.length / 3;
            for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
                const a = (i / N * 2 - 1) * HB, b = (j / N * 2 - 1) * HB;
                const px = ax === 0 ? s : a, py = ax === 1 ? s : (ax === 0 ? a : b), pz = ax === 2 ? s : b;
                HairHead.project(px, py, pz, out);
                positions.push(out[0], out[1], out[2]); normals.push(out[3], out[4], out[5]);
                colors.push(1, 1, 1, 1);
            }
            for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
                const v0 = base + j * (N + 1) + i, v1 = v0 + 1, v2 = v0 + N + 1, v3 = v2 + 1;
                indices.push(v0, v1, v3, v0, v3, v2);
            }
        }
        const mesh = GameGeo.mesh(scene, 'char-head', { positions, normals, indices, colors, updatable: true, orient: 'normals' });
        SalonChar.paintHead(mesh, skin, hairHex, beard);
        return mesh;
    }

    // Цвета вершин головы: кожа, лёгкая тень сверху вниз и «щетина» в зоне роста волос.
    static paintHead(mesh, skin, hairHex, beard) {
        const pos = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind), nor = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        const n = pos.length / 3, colors = new Float32Array(n * 4);
        const sk = HairUtil.rgb(skin), hc = hairHex ? HairUtil.rgb(hairHex) : null;
        for (let i = 0; i < n; i++) {
            const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
            const tone = 1.03 + y * 0.07;
            let r = sk[0] * tone, g = sk[1] * tone, b = sk[2] * tone;
            if (hc) {
                const zone = HairHead.zoneAt(x, y, z, nor[i * 3 + 1], beard);
                if (zone >= 0) { const k = zone === HAIR_ZONE.beard ? 0.2 : 0.16; r += (hc[0] - r) * k; g += (hc[1] - g) * k; b += (hc[2] - b) * k; }
            }
            colors[i * 4] = Math.min(1, r); colors[i * 4 + 1] = Math.min(1, g); colors[i * 4 + 2] = Math.min(1, b); colors[i * 4 + 3] = 1;
        }
        mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, colors, true, 4);
    }

    // Накладка лица: лоскут передней грани головы, чуть над поверхностью.
    static faceMesh(scene) {
        const N = 14, HB = HairHead.HB, R = 0.66, out = [0, 0, 0, 0, 0, 0];
        const positions = [], normals = [], uvs = [], indices = [];
        for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
            const x = (i / N * 2 - 1) * R, y = (j / N * 2 - 1) * R;
            HairHead.project(x, y, HB, out);
            positions.push(out[0] + out[3] * 0.004, out[1] + out[4] * 0.004, out[2] + out[5] * 0.004);
            normals.push(out[3], out[4], out[5]);
            uvs.push(x / (HB * 2) + 0.5, y / (HB * 2) + 0.5);
        }
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const v0 = j * (N + 1) + i, v1 = v0 + 1, v2 = v0 + N + 1, v3 = v2 + 1;
            indices.push(v0, v1, v3, v0, v3, v2);
        }
        return GameGeo.mesh(scene, 'char-face', { positions, normals, uvs, indices, orient: 'normals' });
    }

    static eyeMesh(scene) {
        // тёмный овал с белым бликом (два диска)
        const seg = 16, positions = [0, 0, 0], colors = [0.11, 0.118, 0.14, 1], indices = [];
        for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; positions.push(Math.cos(a) * 0.082, Math.sin(a) * 0.135, 0); colors.push(0.11, 0.118, 0.14, 1); }
        for (let i = 1; i <= seg; i++) indices.push(0, i, i + 1);
        const b = positions.length / 3;
        positions.push(0.028, 0.06, 0.004); colors.push(1, 1, 1, 1);
        for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 2; positions.push(0.028 + Math.cos(a) * 0.03, 0.06 + Math.sin(a) * 0.036, 0.004); colors.push(1, 1, 1, 1); }
        for (let i = 1; i <= 10; i++) indices.push(b, b + i, b + i + 1);
        const normals = [];
        for (let i = 0; i < positions.length / 3; i++) normals.push(0, 0, 1);
        const m = GameGeo.mesh(scene, 'char-eye', { positions, normals, indices, colors });
        m.isPickable = false;
        return m;
    }

    static eyeMaterial(scene) {
        if (SalonChar._eyeMat && SalonChar._eyeMat.getScene() === scene) return SalonChar._eyeMat;
        const m = new BABYLON.StandardMaterial('char-eye-mat', scene);
        m.disableLighting = true; m.emissiveColor = new BABYLON.Color3(1, 1, 1);
        m.diffuseColor = new BABYLON.Color3(0, 0, 0); m.specularColor = new BABYLON.Color3(0, 0, 0);
        m.backFaceCulling = false; m.zOffset = -3; m.metadata = { toon: false };
        SalonChar._eyeMat = m;
        return m;
    }

    // --- раскраска (порт paintBasicOutfit: куртка поверх футболки, «игрушечная» тень) ---------

    _paintOutfit() {
        const scene = this.scene, o = this.look, S = CHAR_UV.shirt;
        const toy = (g, x, y, w, h, s) => {
            const gr = g.createLinearGradient(0, y, 0, y + h);
            gr.addColorStop(0, 'rgba(255,255,255,' + 0.13 * s + ')'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + 0.16 * s + ')');
            g.fillStyle = gr; g.fillRect(x, y, w, h);
            g.strokeStyle = 'rgba(0,0,0,' + 0.2 * s + ')'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
        };
        const torso = new BABYLON.DynamicTexture('char-torso-tex', { width: S.W, height: S.H }, scene, true);
        const g = /** @type {CanvasRenderingContext2D} */ (torso.getContext());
        g.fillStyle = o.shirt; g.fillRect(0, 0, S.W, S.H);
        const f = S.pz;
        if (o.undershirt) {
            g.fillStyle = o.undershirt; g.fillRect(f[0] + 42, f[1], 44, f[3]);
            g.fillStyle = GameGeo.shade(o.shirt, -0.08);
            g.beginPath(); g.moveTo(f[0] + 42, 0); g.lineTo(f[0] + 58, 0); g.lineTo(f[0] + 42, 46); g.fill();
            g.beginPath(); g.moveTo(f[0] + 86, 0); g.lineTo(f[0] + 70, 0); g.lineTo(f[0] + 86, 46); g.fill();
        }
        if (o.apron) {
            // фартук мастера: нагрудник с лямками и карманом
            g.fillStyle = o.apron; g.fillRect(f[0] + 26, f[1] + 34, 76, 94);
            g.fillRect(f[0] + 30, f[1], 10, 40); g.fillRect(f[0] + 88, f[1], 10, 40);
            g.fillStyle = GameGeo.shade(o.apron, -0.1); g.fillRect(f[0] + 44, f[1] + 78, 40, 30);
            g.fillStyle = GameGeo.shade(o.apron, 0.12); g.fillRect(f[0] + 26, f[1] + 34, 76, 6);
        }
        for (const k of ['pz', 'nz', 'px', 'nx', 'py', 'ny']) { const r = S[k]; toy(g, r[0], r[1], r[2], r[3], k === 'py' || k === 'ny' ? 0.4 : 1); }
        torso.update();
        const arm = new BABYLON.DynamicTexture('char-arm-tex', { width: 64, height: 128 }, scene, true);
        const ga = /** @type {CanvasRenderingContext2D} */ (arm.getContext());
        ga.fillStyle = o.skin; ga.fillRect(0, 0, 64, 128);
        ga.fillStyle = o.shirt; ga.fillRect(0, 0, 64, o.sleeve === 'long' ? 110 : 62);
        ga.fillStyle = GameGeo.shade(o.shirt, -0.12); ga.fillRect(0, (o.sleeve === 'long' ? 110 : 62) - 8, 64, 8);
        toy(ga, 0, 0, 64, 128, 0.8); arm.update();
        const leg = new BABYLON.DynamicTexture('char-leg-tex', { width: 64, height: 128 }, scene, true);
        const gl = /** @type {CanvasRenderingContext2D} */ (leg.getContext());
        gl.fillStyle = o.pants; gl.fillRect(0, 0, 64, 128);
        gl.fillStyle = 'rgba(0,0,0,0.12)'; gl.fillRect(30, 0, 3, 128);
        toy(gl, 0, 0, 64, 128, 0.8); leg.update();
        this._tex = [torso, arm, leg];
        return { torso, arm, leg };
    }

    // Лицо: румянец, рот и брови на прозрачной накладке (координаты базы ×2: холст 256).
    setFace(name) {
        const face = CHAR_FACES.indexOf(name) >= 0 ? name : 'smile';
        this.face = face;
        const g = /** @type {CanvasRenderingContext2D} */ (this.faceTex.getContext());
        g.clearRect(0, 0, 256, 256);
        const ink = '#1c1e24';
        g.lineCap = 'round'; g.lineJoin = 'round';
        const blush = face === 'angry' ? 'rgba(255,70,60,0.34)' : face === 'scared' || face === 'worry' ? 'rgba(160,190,255,0.22)' : 'rgba(255,110,110,0.24)';
        g.fillStyle = blush;
        g.beginPath(); g.arc(56, 160, 20, 0, Math.PI * 2); g.arc(200, 160, 20, 0, Math.PI * 2); g.fill();
        const brow = (x, y, a, len) => {
            g.strokeStyle = ink; g.lineWidth = 9;
            g.beginPath(); g.moveTo(x - len * Math.cos(a), y - len * Math.sin(a)); g.lineTo(x + len * Math.cos(a), y + len * Math.sin(a)); g.stroke();
        };
        const closedEye = (x, y) => { g.strokeStyle = ink; g.lineWidth = 10; g.beginPath(); g.arc(x, y + 8, 16, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); };
        g.strokeStyle = ink; g.lineWidth = 10;
        let eyes = true, wide = 1;
        if (face === 'happy') {
            eyes = false; closedEye(88, 108); closedEye(168, 108);
            g.fillStyle = '#5a1e22'; g.beginPath(); g.moveTo(82, 140); g.quadraticCurveTo(128, 212, 174, 140); g.closePath(); g.fill();
            g.fillStyle = '#ffffff'; g.fillRect(92, 140, 72, 11);
            g.fillStyle = '#e8606a'; g.beginPath(); g.ellipse(128, 178, 20, 10, 0, 0, Math.PI * 2); g.fill();
        } else if (face === 'worry') {
            brow(86, 70, -0.42, 17); brow(170, 70, 0.42, 17); wide = 1.1;
            g.beginPath(); g.moveTo(98, 172);
            g.bezierCurveTo(108, 160, 118, 180, 128, 168); g.bezierCurveTo(138, 158, 148, 178, 158, 168); g.stroke();
        } else if (face === 'scared') {
            brow(86, 62, -0.5, 18); brow(170, 62, 0.5, 18); wide = 1.32;
            g.fillStyle = '#5a1e22'; g.beginPath(); g.ellipse(128, 172, 24, 17, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#ffffff'; g.fillRect(108, 157, 40, 8);
        } else if (face === 'angry') {
            brow(88, 74, 0.45, 19); brow(168, 74, -0.45, 19); wide = 0.82;
            g.beginPath(); g.arc(128, 196, 34, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
        } else if (face === 'wow') {
            brow(86, 58, -0.2, 16); brow(170, 58, 0.2, 16); wide = 1.25;
            g.fillStyle = '#5a1e22'; g.beginPath(); g.ellipse(128, 170, 17, 24, 0, 0, Math.PI * 2); g.fill();
        } else if (face === 'neutral') {
            g.beginPath(); g.moveTo(104, 166); g.lineTo(152, 166); g.stroke();
        } else {
            g.beginPath(); g.arc(128, 132, 44, 0.2, Math.PI - 0.2); g.stroke();
        }
        this.faceTex.update();
        this.eyeShow = eyes; this.eye.wide = wide;
    }

    // --- причёска и накидка ------------------------------------------------------------------

    /** @param {HairField} field @param {{ lodDiv?: number }} [opts] */
    setHair(field, opts) {
        if (!this.hair) this.hair = new HairView(this.scene, this.headNode, opts || {});
        this.hair.setField(field);
        SalonChar.paintHead(this.head, this.look.skin, field.spec && field.spec.color, !!(field.spec && field.spec.beard));
        return this.hair;
    }

    // Накидка парикмахера: «колокол» от шеи до колен, спереди длиннее (накрывает колени сидящего).
    // colors — цвет или [основной, полосы, воротник]; pattern — 'stripes' | 'plain' | 'wide' | 'hem'.
    setCape(on, colors, pattern) {
        if (!on) { if (this.cape) this.cape.setEnabled(false); return; }
        const cols = Array.isArray(colors) ? colors : [colors || '#ffffff', null, null];
        if (!this.cape) {
            // Сечение — скруглённый прямоугольник (обнимает блочный торс и руки): сверху «воротник»
            // от шеи до плеч, дальше полотно вниз; спереди оно накрывает колени сидящего.
            const prof = [0, 0.05, 0.1, 0.15, 0.19, 0.23, 0.3, 0.4, 0.52, 0.64, 0.76, 0.88, 1];
            const rings = prof.length - 1, seg = 36, positions = [], indices = [], colors = [];
            const c = HairUtil.rgb(cols[0] || '#ffffff');
            const c2 = cols[1] ? HairUtil.rgb(cols[1]) : [c[0] * 0.9, c[1] * 0.9, c[2] * 0.9];
            const c3 = cols[2] ? HairUtil.rgb(cols[2]) : c;
            const pat = pattern || 'stripes', bands = pat === 'wide' ? 8 : 18;
            const N = 3.4;
            for (let j = 0; j <= rings; j++) {
                const t = prof[j];
                let a, bb, bf, y;
                if (t <= 0.19) {
                    const s = HairUtil.smooth(0, 0.19, t), k = 0.26 + 0.74 * s;       // воротник: от шеи к плечам
                    a = 2.2 * k; bb = 0.98 * k; bf = 0.98 * k; y = 0.11 - 0.05 * s * s;
                } else {
                    const u = (t - 0.19) / 0.81;                                       // полотно
                    a = 2.2 + 0.32 * u; bb = 0.98 + 0.22 * u; bf = 0.98 + 2.25 * Math.pow(u, 0.8); y = 0.06 - 2.7 * u;
                }
                for (let i = 0; i <= seg; i++) {
                    const ang = i / seg * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang);
                    const b = sa > 0 ? bf : bb;
                    // точка суперэллипса в направлении (ca, sa)
                    const r = 1 / Math.pow(Math.pow(Math.abs(ca / a), N) + Math.pow(Math.abs(sa / b), N), 1 / N);
                    const wave = 1 + 0.035 * Math.sin(ang * 9) * Math.max(0, t - 0.3) * 1.4;
                    positions.push(ca * r * wave, y, sa * r * wave + 0.02);
                    // узор: полосы вдоль полотна, широкие полосы, кайма по подолу или гладкая; воротник — своим цветом
                    const odd = Math.floor((ang / (Math.PI * 2)) * bands) % 2 === 1;
                    const second = pat === 'hem' ? t > 0.86 : pat === 'plain' ? false : odd;
                    const src = t <= 0.05 ? c3 : second ? c2 : c;
                    const k = 0.9 + 0.1 * (1 - t);
                    colors.push(Math.min(1, src[0] * k), Math.min(1, src[1] * k), Math.min(1, src[2] * k), 1);
                }
            }
            for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
                const v0 = j * (seg + 1) + i, v1 = v0 + 1, v2 = v0 + seg + 1, v3 = v2 + 1;
                indices.push(v0, v2, v1, v1, v2, v3);
            }
            const cape = GameGeo.mesh(this.scene, 'char-cape', { positions, indices, colors, orient: 'axisY' });
            const mat = new BABYLON.StandardMaterial('char-cape-mat', this.scene);
            mat.specularColor = new BABYLON.Color3(0, 0, 0); mat.backFaceCulling = false;
            cape.material = mat; this._mats.push(mat);
            cape.parent = this.torsoNode; cape.position.y = CH.torsoH / 2;
            World3D.addObject(this.view, cape, 'actor', { ink: false, outline: false });
            this.cape = cape;
        }
        this.cape.setEnabled(true);
    }

    // --- положение и позы ----------------------------------------------------------------------

    // x, y — px карты; h — высота пола под ногами (px); heading — курс (рад, atan2(vy, vx)).
    place(x, y, h, heading) {
        this.x = x; this.y = y; this.h = h || 0;
        if (heading != null) this.heading = heading;
        this.root.position.set(this.x, this.h + this.lift(), this.y);
        this.root.rotation.y = Math.PI / 2 - this.heading;
    }

    // Подъём корня в позе (сидя таз опускается на сиденье — высоту задаёт игра через seatH).
    lift() { return this.pose === 'sit' ? (this.seatH || 0) - CH.legH * CHAR_PX + CH.legW * 0.5 * CHAR_PX : 0; }

    setPose(pose, seatH) {
        this.pose = pose;
        if (seatH != null) this.seatH = seatH;
        this.place(this.x, this.y, this.h, this.heading);
    }

    // Мировая точка центра головы (Babylon): для камеры стрижки.
    headWorld() {
        this.headNode.computeWorldMatrix(true);
        return this.headNode.getAbsolutePosition();
    }

    celebrate(sec) { this.celebrateT = this.celebrateDur = Math.max(0.5, sec || 1.6); }

    setVisible(on) { this.root.setEnabled(!!on); }

    update(dt, moving, speedFactor) {
        dt = Math.min(Math.max(dt || 0, 0), 0.1);
        this.moving = !!moving;
        this.time += dt;
        // глаза
        const e = this.eye;
        if (this.gaze) { e.tx = this.gaze.x; e.ty = this.gaze.y; }
        else {
            e.nextLook -= dt;
            if (e.nextLook <= 0) {
                const r = Math.random();
                if (moving) { e.tx = (Math.random() - 0.5) * 0.7; e.ty = -0.15 + (Math.random() - 0.5) * 0.4; e.nextLook = 0.5 + Math.random() * 1.2; }
                else if (r < 0.18) { e.tx = e.tx > 0 ? -1 : 1; e.ty = 0.1; e.nextLook = 0.25 + Math.random() * 0.2; }
                else if (r < 0.35) { e.tx = 0; e.ty = 0; e.nextLook = 1 + Math.random() * 1.5; }
                else { e.tx = Math.random() * 2 - 1; e.ty = (Math.random() * 2 - 1) * 0.8; e.nextLook = 0.6 + Math.random() * 2.2; }
            }
        }
        const ek = Math.min(1, dt * 20);
        e.x += (e.tx - e.x) * ek; e.y += (e.ty - e.y) * ek;
        e.nextBlink -= dt;
        if (e.nextBlink <= 0) { e.bt = 0.14; e.nextBlink = Math.random() < 0.15 ? 0.22 : 2 + Math.random() * 3.5; }
        if (e.bt > 0) { e.bt = Math.max(0, e.bt - dt); e.blink = 1 - 0.9 * Math.sin(Math.PI * (1 - e.bt / 0.14)); } else e.blink = 1;
        for (const em of this.eyes) {
            em.setEnabled(!!this.eyeShow);
            em.position.x = em.metadata.restX + e.x * 0.07;
            em.position.y = em.metadata.restY + e.y * 0.05;
            em.scaling.y = e.blink * e.wide; em.scaling.x = 0.9 + 0.1 * e.wide;
        }
        // тело
        const sf = Math.min(2.2, Math.max(0.4, speedFactor || 1));
        this.t += dt * (moving ? 9 * sf : 2.2);
        const s = Math.sin(this.t), amp = moving ? Math.min(1.05, 0.7 + sf * 0.18) : 0.045;
        let aLx = s * amp, aRx = -s * amp, aLz = 0, aRz = 0, lLx = -s * amp, lRx = s * amp;
        let bodyY = 0, lean = 0, spin = 0, headYaw = 0, headPitch = 0;
        if (moving) { bodyY = Math.abs(Math.cos(this.t)) * 0.16; lean = 0.05 + 0.03 * sf; }
        else { headYaw = Math.sin(this.time * 0.6) * 0.14; headPitch = Math.sin(this.time * 0.9) * 0.03; aLz = 0.03; aRz = -0.03; }
        if (this.pose === 'sit') {
            lLx = lRx = -Math.PI / 2; aLx = aRx = -0.42; aLz = 0.06; aRz = -0.06; bodyY = 0; lean = 0;
            if (this.cape && this.cape.isEnabled()) { aLx = aRx = 0; aLz = aRz = 0; }    // под накидкой руки опущены: иначе рёбра торчат сквозь ткань
            headYaw *= 0.5;
        } else if (this.pose === 'sweep') {
            const w = Math.sin(this.time * 7);
            aLx = -0.9 + w * 0.35; aRx = -0.7 - w * 0.35; aLz = -0.25; aRz = 0.25; lean = 0.16; lLx = w * 0.12; lRx = -w * 0.12;
        } else if (this.pose === 'work') {
            const w = Math.sin(this.time * 5);
            aRx = -1.15 + w * 0.12; aLx = -0.5; aRz = 0.1; lean = 0.06;
        }
        if (this.celebrateT > 0) {
            this.celebrateT = Math.max(0, this.celebrateT - dt);
            const p = 1 - this.celebrateT / (this.celebrateDur || 1), wave = Math.sin(this.time * 15);
            aLx = -2.75 + wave * 0.22; aRx = -2.75 - wave * 0.22; aLz = -0.5; aRz = 0.5;
            if (this.pose !== 'sit') {
                const hop = Math.abs(Math.sin(p * Math.PI * 3));
                bodyY = hop * 0.85; lLx = -0.35 * hop; lRx = 0.25 * hop; lean = -0.06;
                spin = p < 0.42 ? (1 - Math.pow(1 - p / 0.42, 3)) * Math.PI * 2 : 0;
            }
            headPitch = -0.12;
        }
        const k = 1 - Math.exp(-(moving ? 18 : 11) * dt);
        const ap = (obj, prop, target, kk) => { obj[prop] += (target - obj[prop]) * kk; };
        ap(this.armL.rotation, 'x', aLx, k); ap(this.armR.rotation, 'x', aRx, k);
        ap(this.armL.rotation, 'z', aLz, k); ap(this.armR.rotation, 'z', aRz, k);
        ap(this.legL.rotation, 'x', lLx, k); ap(this.legR.rotation, 'x', lRx, k);
        ap(this.body.position, 'y', bodyY, Math.min(1, k * 1.6));
        ap(this.body.rotation, 'x', lean, k);
        ap(this.headNode.rotation, 'y', headYaw + this.headTilt, k * 0.5);
        ap(this.headNode.rotation, 'x', headPitch + this.headNod, k * 0.5);
        this.body.rotation.y = spin;
        this.torsoNode.rotation.y = moving ? s * 0.07 : 0;
        if (this.hair) {
            if (moving && Math.abs(Math.cos(this.t)) < 0.2 && !this._stepKick) { this.hair.kick(0, -0.9, 0); this._stepKick = true; }
            else if (Math.abs(Math.cos(this.t)) > 0.5) this._stepKick = false;
            this.hair.update(dt);
        }
    }

    dispose() {
        if (this.hair) { this.hair.dispose(); this.hair = null; }
        World3D.removeObject(this.view, this.root);
        this.root.dispose(false, false);
        for (const m of this._mats) m.dispose();
        for (const t of this._tex || []) t.dispose();
        this.faceTex.dispose();
    }
}
/** @type {BABYLON.StandardMaterial | null} */
SalonChar._eyeMat = null;
