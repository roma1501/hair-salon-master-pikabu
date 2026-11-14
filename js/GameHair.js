// GameHair.js — волосы игры «Hair Salon Master»: форма головы, поле прядей, вид (инстансы +
// шейдер), стрижка и падающие клочки.
//
// Единицы — «головные» (hu): голова — скруглённый куб с полуразмером 0.75 (как у персонажа-базы
// из Steal a Dragon Egg: куб 1.5), x — вправо, y — вверх, z — лицо. Меш прядей висит на узле
// головы персонажа и масштабируется вместе с ним.
//
//   HairHead   — геометрия головы: sdf / grad / project, линия волос, борода, зоны.
//   HairField  — данные причёски одного клиента: корни, длины, цвета, цели заказа, стрижка
//                (cutClipper / cutCapsule), оценка (score). Чистая логика, без Babylon.
//   HairView   — меш прядей (thin instances) и материал; толчки инструмента, качание.
//   HairClumps — срезанные клочки: полёт, столкновения с головой, накидкой и полом, сметание.

/** @satisfies {Record<string, any>} */
const HairUtil = {
    // Детерминированный ГСЧ (mulberry32): причёска клиента одинакова при одном зерне.
    rng(seed) {
        let a = (seed >>> 0) || 1;
        return () => {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },
    // '#rrggbb' -> [r, g, b] 0..1
    rgb(hex) {
        const n = parseInt(String(hex).replace('#', ''), 16) || 0;
        return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    },
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    smooth(a, b, x) { const t = HairUtil.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); },
    lerp(a, b, t) { return a + (b - a) * t; },
};

// Зоны причёски (индекс зоны пряди).
const HAIR_ZONE = { top: 0, front: 1, left: 2, right: 3, back: 4, beard: 5 };
const HAIR_ZONE_NAMES = ['top', 'front', 'left', 'right', 'back', 'beard'];

/** @satisfies {Record<string, any>} */
const HairHead = {
    HB: 0.75,          // полуразмер головы
    HR: 0.30,          // радиус скругления
    IN: 0.45,          // HB − HR: полуразмер внутреннего куба
    // Плечи под накидкой (эллипсоид в координатах головы): длинные пряди ложатся на него.
    CAPE_C: [0, -1.8, 0.02],
    CAPE_R: [2.3, 1.08, 1.06],

    // Расстояние со знаком до поверхности головы.
    sdf(x, y, z) {
        const qx = Math.abs(x) - this.IN, qy = Math.abs(y) - this.IN, qz = Math.abs(z) - this.IN;
        const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
        const inside = Math.min(Math.max(qx, qy, qz), 0);
        return Math.sqrt(mx * mx + my * my + mz * mz) + inside - this.HR;
    },

    // Наружная нормаль поля расстояний в точке (out — массив из 3).
    grad(x, y, z, out) {
        const qx = Math.abs(x) - this.IN, qy = Math.abs(y) - this.IN, qz = Math.abs(z) - this.IN;
        const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
        const l = Math.sqrt(mx * mx + my * my + mz * mz);
        const sx = x < 0 ? -1 : 1, sy = y < 0 ? -1 : 1, sz = z < 0 ? -1 : 1;
        if (l > 1e-6) { out[0] = sx * mx / l; out[1] = sy * my / l; out[2] = sz * mz / l; return out; }
        if (qx > qy && qx > qz) { out[0] = sx; out[1] = 0; out[2] = 0; }
        else if (qy > qz) { out[0] = 0; out[1] = sy; out[2] = 0; }
        else { out[0] = 0; out[1] = 0; out[2] = sz; }
        return out;
    },

    // Точка куба (|coord| ≤ HB, одна из координат = ±HB) -> точка и нормаль скруглённой поверхности.
    // out: [x, y, z, nx, ny, nz]. Возвращает число координат за внутренним кубом (0 грань, 1 ребро, 2 угол).
    project(px, py, pz, out) {
        const IN = this.IN, R = this.HR;
        const cx = px < -IN ? -IN : px > IN ? IN : px;
        const cy = py < -IN ? -IN : py > IN ? IN : py;
        const cz = pz < -IN ? -IN : pz > IN ? IN : pz;
        let dx = px - cx, dy = py - cy, dz = pz - cz;
        const beyond = (dx !== 0 ? 1 : 0) + (dy !== 0 ? 1 : 0) + (dz !== 0 ? 1 : 0);
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= l; dy /= l; dz /= l;
        out[0] = cx + dx * R; out[1] = cy + dy * R; out[2] = cz + dz * R;
        out[3] = dx; out[4] = dy; out[5] = dz;
        return beyond - 1;
    },

    // Высота линии роста волос по углу вокруг вертикали (|phi|: 0 — лицо, π — затылок).
    hairline(a) {
        const S = HairUtil.smooth;
        const front = 0.43 + 0.035 * Math.cos(a * 4.2);          // лоб, лёгкий «мысок»
        const side = -0.04;                                      // над ухом
        const back = -0.42;                                      // шея
        let y = HairUtil.lerp(front, side, S(0.62, 1.0, a));
        y = HairUtil.lerp(y, back, S(2.25, 2.8, a));
        return y;
    },

    // Верхняя граница бороды по углу (ниже неё — борода); −9 — бороды нет.
    beardLine(a) {
        const S = HairUtil.smooth;
        if (a > 1.5) return -9;
        let y = HairUtil.lerp(-0.41, -0.15, S(0.42, 0.88, a));    // подбородок -> щека
        y = HairUtil.lerp(y, -0.04, S(0.88, 1.06, a));            // щека -> бакенбарда
        y = HairUtil.lerp(y, -0.9, S(1.3, 1.5, a));               // за ухом сходит на нет
        return y;
    },

    // Зона точки поверхности (или −1 — здесь волосы не растут). withBeard — растёт ли борода.
    zoneAt(x, y, z, ny, withBeard) {
        const a = Math.abs(Math.atan2(x, z));
        if (y > this.hairline(a)) {
            if (z > 0.36 && a < 0.8) return HAIR_ZONE.front;
            if (ny > 0.5) return HAIR_ZONE.top;
            if (a < 2.3) return x < 0 ? HAIR_ZONE.left : HAIR_ZONE.right;
            return HAIR_ZONE.back;
        }
        if (withBeard && z > -0.12 && y < this.beardLine(a)) return HAIR_ZONE.beard;
        return -1;
    },
};

// ---------------------------------------------------------------------------------------------
// HairField — причёска одного клиента
// ---------------------------------------------------------------------------------------------
// spec (стиль отросших волос): {
//   color: '#rrggbb', color2?: '#rrggbb' (пряди второго цвета), streak?: доля 0..1,
//   len:  { top, front, side, back, beard }      — длины по зонам, hu
//   lay:  { top, front, side, back, beard }      — 0 торчит по нормали … 0.95 лежит по потоку
//   noise: разброс длины 0..1, curl: волнистость, thick: толщина «шапки» лежащих волос,
//   width: ширина пряди, flow: 'crown' | 'forward' | 'back' | 'side' | 'up',
//   beard: true — есть борода, shape?: (x, y, z, zone) => множитель длины }
class HairField {
    /** @param {number} n */
    constructor(n) {
        this.n = n;
        this.count = n;                        // реально созданных прядей
        /** @type {number | null} */
        this.score0 = null;                    // доля «в цели» до начала стрижки
        this.mat = new Float32Array(n * 16);   // упаковка: root+rand | normal+lay | comb+curl | zone,width,thick,shade
        this.dyn = new Float32Array(n * 4);    // длина, флаг (1 — надо срезать, −1 — срезано лишнее), время среза, запас
        this.col = new Float32Array(n * 3);
        this.zone = new Uint8Array(n);
        this.len0 = new Float32Array(n);
        this.tLo = new Float32Array(n);        // цель: минимум длины
        this.tHi = new Float32Array(n).fill(1e9);   // цель: максимум длины
        this.tW = new Float32Array(n);         // вес пряди в оценке
        this.sp = new Float32Array(n * 12);    // точки пряди на t = 0.25, 0.5, 0.75, 1 (для стрижки)
        this.grav = 0.5;
        this.hasTargets = false;
        this.dirty = true;                     // dyn менялся — вид перезальёт буфер
        this.colDirty = false;
        /** срезы этого кадра для клочков: [x, y, z, длина, r, g, b] подряд */
        this.events = [];
        this._acc = 0;
        this.cutTotal = 0;                     // сколько всего срезано (hu длины)
        this.spec = null;
    }

    // Сгенерировать причёску. n — число прядей (первые n/k — равномерная подвыборка для LOD).
    static generate(spec, seed, n) {
        const f = new HairField(n);
        f.spec = spec;
        const rnd = HairUtil.rng(seed);
        const H = HairHead, HB = H.HB;
        const out = [0, 0, 0, 0, 0, 0];
        const c1 = HairUtil.rgb(spec.color), c2 = spec.color2 ? HairUtil.rgb(spec.color2) : c1;
        const lenOf = spec.len || {}, layOf = spec.lay || {};
        const zl = [lenOf.top, lenOf.front, lenOf.side, lenOf.side, lenOf.back, lenOf.beard];
        const zy = [layOf.top, layOf.front, layOf.side, layOf.side, layOf.back, layOf.beard];
        const noise = spec.noise == null ? 0.2 : spec.noise;
        const flow = spec.flow || 'crown';
        const crownX = 0.06, crownZ = -0.18;
        const accept = [0.64, 1.0, 0.33];       // выравнивание густоты: грань, ребро, угол
        let i = 0, guard = 0;
        while (i < n && guard++ < n * 60) {
            // случайная точка на поверхности куба
            const face = Math.floor(rnd() * 6), a = (rnd() * 2 - 1) * HB, b = (rnd() * 2 - 1) * HB;
            const s = face & 1 ? HB : -HB, ax = face >> 1;
            const px = ax === 0 ? s : a, py = ax === 1 ? s : (ax === 0 ? a : b), pz = ax === 2 ? s : b;
            const kind = H.project(px, py, pz, out);
            if (rnd() > accept[kind]) continue;
            const x = out[0], y = out[1], z = out[2], nx = out[3], ny = out[4], nz = out[5];
            const zone = H.zoneAt(x, y, z, ny, !!spec.beard);
            if (zone < 0) continue;
            let L = zl[zone] || 0;
            if (L <= 0.004) continue;
            if (zone === HAIR_ZONE.beard && rnd() < 0.25) continue;   // борода чуть реже
            // поток расчёсывания: на макушке — от макушки наружу (с закруткой), на стенках — вниз
            let fx = x - crownX, fz = z - crownZ;
            const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl;
            const sw = 0.45, cs = Math.cos(sw), sn = Math.sin(sw);
            let rx = fx * cs - fz * sn, rz = fx * sn + fz * cs, ry = 0;
            if (flow === 'forward') { rx = rx * 0.25; rz = 1; }
            else if (flow === 'back') { rx = rx * 0.25; rz = -1; }
            else if (flow === 'side') { rx = 1; rz = rz * 0.2; }
            const topW = HairUtil.smooth(0.15, 0.8, ny);
            let cx = rx * topW, cy = -(1 - topW) + ry, cz = rz * topW;
            if (zone === HAIR_ZONE.beard) { cx = nx * 0.25; cy = -1; cz = nz * 0.25 + 0.1; }
            if (zone === HAIR_ZONE.front && flow !== 'back' && flow !== 'up') { cz += 0.6 * topW; cy -= 0.15; }
            // в касательную плоскость
            const d = cx * nx + cy * ny + cz * nz;
            cx -= nx * d; cy -= ny * d; cz -= nz * d;
            const cl = Math.hypot(cx, cy, cz);
            if (cl < 1e-4) { cx = 1 - nx * nx; cy = -nx * ny; cz = -nx * nz; } else { cx /= cl; cy /= cl; cz /= cl; }
            const r1 = rnd(), r2 = rnd(), r3 = rnd();
            // клочковатость: низкочастотный «шум» по положению
            const patch = 0.5 + 0.5 * Math.sin(x * 7.3 + z * 5.1 + seed * 0.13) * Math.sin(y * 6.1 - z * 4.7 + seed * 0.07);
            L *= 1 + noise * ((r1 - 0.5) * 1.2 + (patch - 0.5) * 0.8);
            if (spec.shape) L *= spec.shape(x, y, z, zone);
            if (L <= 0.004) continue;
            let lay = zy[zone] == null ? 0.6 : zy[zone];
            lay = HairUtil.clamp(lay + (r2 - 0.5) * 0.16, 0, 0.95);
            if (flow === 'up' && zone !== HAIR_ZONE.beard) lay = Math.min(lay, 0.12);
            const o = i * 16;
            f.mat[o] = x; f.mat[o + 1] = y; f.mat[o + 2] = z; f.mat[o + 3] = r1;
            f.mat[o + 4] = nx; f.mat[o + 5] = ny; f.mat[o + 6] = nz; f.mat[o + 7] = lay;
            f.mat[o + 8] = cx; f.mat[o + 9] = cy; f.mat[o + 10] = cz; f.mat[o + 11] = (spec.curl || 0) * (0.5 + r3);
            f.mat[o + 12] = zone; f.mat[o + 13] = (spec.width || 0.03) * (0.75 + 0.5 * r2);
            f.mat[o + 14] = spec.thick == null ? 0.1 : spec.thick; f.mat[o + 15] = 0.78 + 0.44 * r3;
            f.dyn[i * 4] = L; f.len0[i] = L; f.zone[i] = zone;
            const streak = spec.color2 && (patch > 1 - (spec.streak || 0.3)) ? 1 : 0;
            const cc = streak ? c2 : c1;
            f.col[i * 3] = cc[0]; f.col[i * 3 + 1] = cc[1]; f.col[i * 3 + 2] = cc[2];
            f.resample(i);
            i++;
        }
        f.count = i;                            // реально созданных прядей (обычно n)
        return f;
    }

    // Точка пряди i на доле длины t — тот же закон, что в вершинном шейдере (без толчков).
    /** @param {number} i @param {number} t @param {number[]} out */
    curve(i, t, out) {
        const m = this.mat, o = i * 16, L = this.dyn[i * 4], s = t * L;
        const rx = m[o], ry = m[o + 1], rz = m[o + 2], rnd = m[o + 3];
        const nx = m[o + 4], ny = m[o + 5], nz = m[o + 6], lay = m[o + 7];
        const cx = m[o + 8], cy = m[o + 9], cz = m[o + 10], curl = m[o + 11];
        let dx = nx * (1 - lay) + cx * lay, dy = ny * (1 - lay) + cy * lay, dz = nz * (1 - lay) + cz * lay;
        const dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
        const kc = 0.25 * lay, s2 = s * s;
        // боковая волна
        const sx = ny * cz - nz * cy, sy = nz * cx - nx * cz, sz = nx * cy - ny * cx;
        const ph = rnd * 6.2831 + s * 9, wv = Math.sin(ph) * curl * s, wn = Math.cos(ph * 1.3) * curl * 0.5 * s;
        let x = rx + dx * s + cx * kc * s2 + sx * wv + nx * wn;
        let y = ry + dy * s + (cy * kc - this.grav) * s2 + sy * wv + ny * wn;
        let z = rz + dz * s + cz * kc * s2 + sz * wv + nz * wn;
        // голова
        const off = 0.012 + m[o + 14] * Math.sqrt(t) * (0.35 + 0.65 * rnd);
        const d = HairHead.sdf(x, y, z);
        if (d < off) {
            const g = HairHead.grad(x, y, z, HairField._g);
            x += g[0] * (off - d); y += g[1] * (off - d); z += g[2] * (off - d);
        }
        // плечи под накидкой
        const C = HairHead.CAPE_C, R = HairHead.CAPE_R;
        const ex = (x - C[0]) / R[0], ey = (y - C[1]) / R[1], ez = (z - C[2]) / R[2];
        const el = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (el < 1 && el > 1e-5) { x = C[0] + ex / el * R[0]; y = C[1] + ey / el * R[1]; z = C[2] + ez / el * R[2]; }
        out[0] = x; out[1] = y; out[2] = z;
        return out;
    }

    // Пересчитать точки пряди после смены длины.
    /** @param {number} i */
    resample(i) {
        const p = HairField._p, sp = this.sp, o = i * 12;
        for (let k = 0; k < 4; k++) {
            this.curve(i, (k + 1) * 0.25, p);
            sp[o + k * 3] = p[0]; sp[o + k * 3 + 1] = p[1]; sp[o + k * 3 + 2] = p[2];
        }
    }

    // Укоротить прядь и записать срез.
    /** @param {number} i @param {number} newLen */
    _trim(i, newLen) {
        const d = this.dyn, o4 = i * 4, old = d[o4];
        if (newLen >= old - 0.004) return 0;
        const cut = old - newLen;
        // кончик до среза — место, откуда падает клочок
        const sp = this.sp, o = i * 12 + 6;
        const ex = sp[o], ey = sp[o + 1], ez = sp[o + 2];
        d[o4] = newLen;
        if (this.hasTargets) d[o4 + 1] = newLen > this.tHi[i] ? 1 : newLen < this.tLo[i] - 0.004 ? -1 : 0;
        this.resample(i);
        this.dirty = true;
        this.cutTotal += cut;
        this._acc += cut;
        // клочок — примерно на каждые 12 hu срезанной длины; его размер — по длине этого среза
        if (this._acc >= 12 && this.events.length < 7 * 24) {
            this.events.push(ex, ey, ez, Math.min(0.7, cut), this.col[i * 3], this.col[i * 3 + 1], this.col[i * 3 + 2]);
            this._acc = 0;
        }
        return cut;
    }

    // Машинка: нож в точке (c) на голове, нормаль n, направление хода h (касательная), полуширина
    // ножа halfW (поперёк хода), глубина halfD (вдоль), насадка guard (hu). Возвращает срезанную длину.
    cutClipper(cx, cy, cz, nx, ny, nz, hx, hy, hz, halfW, halfD, guard) {
        // поперечная ось ножа
        const sx = ny * hz - nz * hy, sy = nz * hx - nx * hz, sz = nx * hy - ny * hx;
        const m = this.mat, d = this.dyn, sp = this.sp, n = this.count || this.n;
        const lim = guard + 0.006;
        let total = 0;
        for (let i = 0; i < n; i++) {
            const L = d[i * 4];
            if (L <= lim) continue;
            const o = i * 16;
            let rx = m[o] - cx, ry = m[o + 1] - cy, rz = m[o + 2] - cz;
            // корень под ножом — стрижём до насадки
            if (rx * rx + ry * ry + rz * rz < 0.3) {
                const al = rx * hx + ry * hy + rz * hz, ac = rx * sx + ry * sy + rz * sz, up = rx * nx + ry * ny + rz * nz;
                if (al > -halfD && al < halfD && ac > -halfW && ac < halfW && up > -0.2 && up < 0.2) {
                    total += this._trim(i, guard);
                    continue;
                }
            }
            // прядь, лежащая под ножом (корень в стороне): срез там, где она проходит под ним
            const po = i * 12;
            for (let k = 0; k < 4; k++) {
                rx = sp[po + k * 3] - cx; ry = sp[po + k * 3 + 1] - cy; rz = sp[po + k * 3 + 2] - cz;
                if (rx * rx + ry * ry + rz * rz > 0.09) continue;
                const al = rx * hx + ry * hy + rz * hz, ac = rx * sx + ry * sy + rz * sz, up = rx * nx + ry * ny + rz * nz;
                if (al > -halfD && al < halfD && ac > -halfW && ac < halfW && up > -0.08 && up < 0.17) {
                    const t = this._enter(i, k, (x, y, z) => {
                        const ax = x - cx, ay = y - cy, az = z - cz;
                        const a2 = ax * hx + ay * hy + az * hz, c2 = ax * sx + ay * sy + az * sz, u2 = ax * nx + ay * ny + az * nz;
                        return a2 > -halfD && a2 < halfD && c2 > -halfW && c2 < halfW && u2 > -0.08 && u2 < 0.17;
                    });
                    total += this._trim(i, Math.max(guard, t * L));
                    break;
                }
            }
        }
        return total;
    }

    // Ножницы: отрезок лезвий a -> b радиуса r; всё, что проходит между лезвиями, срезается в этом
    // месте (не короче minLen). Возвращает срезанную длину.
    cutCapsule(ax, ay, az, bx, by, bz, r, minLen) {
        const d = this.dyn, sp = this.sp, n = this.count || this.n, r2 = r * r;
        const ex = bx - ax, ey = by - ay, ez = bz - az, el2 = ex * ex + ey * ey + ez * ez || 1e-6;
        const inside = (x, y, z) => {
            const px = x - ax, py = y - ay, pz = z - az;
            let t = (px * ex + py * ey + pz * ez) / el2; t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = px - ex * t, qy = py - ey * t, qz = pz - ez * t;
            return qx * qx + qy * qy + qz * qz < r2;
        };
        const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5, mz = (az + bz) * 0.5, reach = Math.sqrt(el2) * 0.5 + r + 0.02, reach2 = reach * reach;
        let total = 0;
        for (let i = 0; i < n; i++) {
            const L = d[i * 4];
            if (L <= minLen + 0.006) continue;
            const po = i * 12;
            for (let k = 0; k < 4; k++) {
                const x = sp[po + k * 3], y = sp[po + k * 3 + 1], z = sp[po + k * 3 + 2];
                const qx = x - mx, qy = y - my, qz = z - mz;
                if (qx * qx + qy * qy + qz * qz > reach2) continue;
                if (inside(x, y, z)) {
                    const t = this._enter(i, k, inside);
                    total += this._trim(i, Math.max(minLen, t * L));
                    break;
                }
            }
        }
        return total;
    }

    // Доля длины, на которой прядь входит в объём (между точками k−1 и k), делением пополам.
    /** @param {number} i @param {number} k @param {(x: number, y: number, z: number) => boolean} inside */
    _enter(i, k, inside) {
        let lo = k * 0.25, hi = (k + 1) * 0.25;
        const p = HairField._p;
        if (k === 0) { this.curve(i, 0.02, p); if (inside(p[0], p[1], p[2])) return 0.02; }
        for (let it = 0; it < 4; it++) {
            const mid = (lo + hi) * 0.5;
            this.curve(i, mid, p);
            if (inside(p[0], p[1], p[2])) hi = mid; else lo = mid;
        }
        return lo;
    }

    // Перекрасить пряди у точки (краска-спрей): radius hu, цвет rgb 0..1, сила 0..1.
    paint(x, y, z, radius, rgb, k) {
        const sp = this.sp, col = this.col, n = this.count || this.n, r2 = radius * radius;
        let hit = 0;
        for (let i = 0; i < n; i++) {
            if (this.dyn[i * 4] < 0.01) continue;
            const o = i * 12 + 3;
            const dx = sp[o] - x, dy = sp[o + 1] - y, dz = sp[o + 2] - z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > r2) continue;
            const w = k * (1 - d2 / r2), c = i * 3;
            col[c] += (rgb[0] - col[c]) * w; col[c + 1] += (rgb[1] - col[c + 1]) * w; col[c + 2] += (rgb[2] - col[c + 2]) * w;
            hit++;
        }
        if (hit) this.colDirty = true;
        return hit;
    }

    // Цели заказа. zones: { top, front, left, right, side, back, beard } — правило зоны:
    //   { max: hu, min?: hu }  — подстричь до длины (не длиннее max, не короче min);
    //   { keep: доля }        — не трогать: длина не меньше доли исходной;
    //   нет правила           — зона в оценке не участвует.
    // weight — вес зоны (по умолчанию 1).
    setTargets(zones) {
        const n = this.count || this.n, d = this.dyn;
        const rules = [zones.top, zones.front, zones.left || zones.side, zones.right || zones.side, zones.back, zones.beard];
        for (let i = 0; i < n; i++) {
            const r = rules[this.zone[i]];
            if (!r) { this.tLo[i] = 0; this.tHi[i] = 1e9; this.tW[i] = 0; d[i * 4 + 1] = 0; continue; }
            const w = r.weight == null ? 1 : r.weight;
            if (r.keep != null) { this.tLo[i] = this.len0[i] * r.keep; this.tHi[i] = 1e9; }
            else { this.tLo[i] = r.min || 0; this.tHi[i] = Math.min(r.max, 1e9) + 0.012; }
            this.tW[i] = w;
            const L = d[i * 4];
            d[i * 4 + 1] = L > this.tHi[i] ? 1 : L < this.tLo[i] - 0.004 ? -1 : 0;
        }
        this.hasTargets = true;
        this.dirty = true;
        this.score0 = this.score().frac;
    }

    clearTargets() {
        const n = this.count || this.n;
        for (let i = 0; i < n; i++) this.dyn[i * 4 + 1] = 0;
        this.hasTargets = false; this.dirty = true;
    }

    // Оценка: доля прядей (по весу) в пределах цели; need — доля «ещё срезать», over — «срезано лишнее».
    // progress — 0..1 от исходного состояния до идеала.
    score() {
        const n = this.count || this.n, d = this.dyn;
        let ok = 0, need = 0, over = 0, total = 0;
        for (let i = 0; i < n; i++) {
            const w = this.tW[i];
            if (!w) continue;
            total += w;
            const fl = d[i * 4 + 1];
            if (fl > 0.5) need += w; else if (fl < -0.5) over += w; else ok += w;
        }
        const frac = total ? ok / total : 1;
        const s0 = this.score0 == null ? frac : this.score0;
        const progress = s0 >= 0.999 ? 1 : HairUtil.clamp((frac - s0) / (1 - s0), 0, 1);
        return { frac, need: total ? need / total : 0, over: total ? over / total : 0, progress };
    }

    // Средняя длина по зонам (для портрета-цели и отладки).
    zoneStats() {
        const n = this.count || this.n, sum = new Float32Array(6), cnt = new Float32Array(6);
        for (let i = 0; i < n; i++) { sum[this.zone[i]] += this.dyn[i * 4]; cnt[this.zone[i]]++; }
        const out = {};
        for (let z = 0; z < 6; z++) out[HAIR_ZONE_NAMES[z]] = cnt[z] ? sum[z] / cnt[z] : 0;
        return out;
    }

    // Мгновенно привести причёску к цели (превью «как должно быть», NPC с готовой стрижкой).
    applyTargetsNow() {
        const n = this.count || this.n, d = this.dyn;
        for (let i = 0; i < n; i++) {
            if (!this.tW[i]) continue;
            if (d[i * 4] > this.tHi[i]) { d[i * 4] = Math.max(0, this.tHi[i] - 0.012); this.resample(i); }
            d[i * 4 + 1] = 0;
        }
        this.dirty = true;
    }
}
HairField._g = [0, 0, 0];
HairField._p = [0, 0, 0];

// ---------------------------------------------------------------------------------------------
// HairView — меш прядей
// ---------------------------------------------------------------------------------------------
const HAIR_PUSHERS = 6;

const HAIR_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;
attribute vec4 hDyn;
attribute vec3 hCol;
uniform mat4 world;
uniform mat4 viewProjection;
uniform vec3 cameraPosition;
uniform float uTime;
uniform vec4 uTool;
uniform float uToolPush;
uniform vec4 uPushP[${HAIR_PUSHERS}];
uniform vec4 uPushD[${HAIR_PUSHERS}];
uniform vec3 uSway;
uniform float uWidth;
uniform float uGrav;
uniform float uNeed;
uniform vec3 uNeedCol;
uniform vec2 uHead;
uniform vec3 uCapeC;
uniform vec3 uCapeR;
varying vec3 vColor;
varying vec3 vNw;
varying vec3 vTw;
varying vec3 vPw;
varying float vS;
varying float vT;

float sdHead(vec3 p) {
    vec3 q = abs(p) - uHead.x;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - uHead.y;
}
vec3 gradHead(vec3 p) {
    vec3 q = abs(p) - uHead.x;
    vec3 s = vec3(p.x < 0.0 ? -1.0 : 1.0, p.y < 0.0 ? -1.0 : 1.0, p.z < 0.0 ? -1.0 : 1.0);
    vec3 m = max(q, 0.0);
    float l = length(m);
    if (l > 0.000001) return s * m / l;
    if (q.x > q.y && q.x > q.z) return vec3(s.x, 0.0, 0.0);
    if (q.y > q.z) return vec3(0.0, s.y, 0.0);
    return vec3(0.0, 0.0, s.z);
}

void main() {
    float t = position.y;
    float L = hDyn.x;
    float s = t * L;
    vec3 r = world0.xyz; float rnd = world0.w;
    vec3 n = world1.xyz; float lay = world1.w;
    vec3 c = world2.xyz; float curl = world2.w;
    vec3 d0 = normalize(n * (1.0 - lay) + c * lay);
    float kc = 0.25 * lay;
    vec3 B = c * kc + vec3(0.0, -uGrav, 0.0);
    vec3 sd = cross(n, c);
    float ph = rnd * 6.2831 + s * 9.0;
    vec3 p = r + d0 * s + B * (s * s) + sd * (sin(ph) * curl * s) + n * (cos(ph * 1.3) * curl * 0.5 * s);
    vec3 tg = d0 + 2.0 * B * s + sd * (cos(ph) * 9.0 * curl * s + sin(ph) * curl);

    // толчки: качание головы, след инструмента, сам инструмент
    vec3 dyn = uSway;
    for (int i = 0; i < ${HAIR_PUSHERS}; i++) {
        vec3 dl = p - uPushP[i].xyz;
        float f = max(0.0, 1.0 - dot(dl, dl) / max(uPushP[i].w * uPushP[i].w, 0.000001));
        dyn += uPushD[i].xyz * (f * f);
    }
    vec3 dt = p - uTool.xyz;
    float ft = max(0.0, 1.0 - dot(dt, dt) / max(uTool.w * uTool.w, 0.000001));
    dyn += normalize(dt + vec3(0.0001)) * (ft * uToolPush);
    float flex = t * t * min(1.0, L * 2.2);
    p += dyn * flex;
    tg += dyn * (2.0 * t * min(1.0, L * 2.2));

    // голова и плечи не пропускают прядь внутрь
    float off = 0.012 + world3.z * sqrt(t) * (0.35 + 0.65 * rnd);
    float d = sdHead(p);
    vec3 gN = n;
    if (d < off) { gN = gradHead(p); p += gN * (off - d); tg -= gN * min(0.0, dot(tg, gN)); }
    vec3 e = (p - uCapeC) / uCapeR;
    float el = length(e);
    if (el < 1.0 && el > 0.00001) { p = uCapeC + e / el * uCapeR; }

    vec4 wp = world * vec4(p, 1.0);
    vec3 tw = normalize(mat3(world) * tg);
    vec3 V = normalize(cameraPosition - wp.xyz);
    vec3 side = cross(tw, V);
    float sl = length(side);
    side = sl > 0.0001 ? side / sl : vec3(1.0, 0.0, 0.0);
    float ws = length(world[0].xyz);
    float w = world3.y * uWidth * (1.0 - 0.82 * pow(t, 1.5)) * ws;
    if (L < 0.006) w = 0.0;
    wp.xyz += side * (position.x * w);
    gl_Position = viewProjection * wp;

    vec3 col = hCol * world3.w;
    float need = step(0.5, hDyn.y) * uNeed;
    col = mix(col, uNeedCol, need * (0.46 + 0.18 * sin(uTime * 6.0 + rnd * 3.0)));
    vColor = col;
    vNw = normalize(mat3(world) * mix(n, gN, 0.5));
    vTw = tw;
    vPw = wp.xyz;
    vS = s;
    vT = t;
}
`;

const HAIR_FRAGMENT = `
precision highp float;
uniform vec3 cameraPosition;
uniform vec3 uLightDir;
uniform vec3 uAmbient;
varying vec3 vColor;
varying vec3 vNw;
varying vec3 vTw;
varying vec3 vPw;
varying float vS;
varying float vT;
void main() {
    vec3 N = normalize(vNw);
    vec3 T = normalize(vTw);
    vec3 V = normalize(cameraPosition - vPw);
    vec3 Ld = normalize(uLightDir);
    float wrap = dot(N, Ld) * 0.5 + 0.5;
    float diff = 0.42 + 0.66 * wrap * wrap;
    // у корня темнее (тень в глубине волос), кончики светлее
    float ao = mix(0.5, 1.0, smoothstep(0.0, 0.22, vS)) * mix(0.9, 1.08, vT);
    vec3 H = normalize(Ld + V);
    float th = dot(T, H);
    float spec = pow(sqrt(max(0.0, 1.0 - th * th)), 46.0) * 0.32 * smoothstep(0.03, 0.25, vS);
    float rim = pow(1.0 - max(0.0, dot(N, V)), 3.0) * 0.16;
    vec3 col = vColor * (diff * ao) * uAmbient + vec3(spec) * (0.5 + 0.5 * vColor) + vColor * rim;
    gl_FragColor = vec4(col, 1.0);
}
`;

class HairView {
    // parent — узел головы (TransformNode/Mesh). opts: { segments }
    constructor(scene, parent, opts) {
        const o = opts || {};
        this.scene = scene;
        /** @type {HairField | null} */
        this.field = null;
        this.time = Math.random() * 10;
        this.full = false;
        this.lodDiv = o.lodDiv || 7;
        this.showNeed = 0;
        this.needCol = [1, 0.16, 0.12];          // цвет подсветки «срезать» (на рыжих волосах — синий)
        this.sway = [0, 0, 0]; this.swayV = [0, 0, 0];
        this.tool = [0, 0, 0, 0]; this.toolPush = 0;
        this.pushP = new Array(HAIR_PUSHERS * 4).fill(0);
        this.pushD = new Array(HAIR_PUSHERS * 4).fill(0);
        /** @type {{ x: number, y: number, z: number, r: number, dx: number, dy: number, dz: number, age: number }[]} */
        this.pushers = [];
        this._slot = 0;

        const seg = o.segments || 4;
        const pos = [], idx = [];
        for (let i = 0; i <= seg; i++) { const t = i / seg; pos.push(-1, t, 0, 1, t, 0); }
        for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        const mesh = new BABYLON.Mesh('hair', scene);
        const vd = new BABYLON.VertexData();
        vd.positions = pos; vd.indices = idx;
        vd.applyToMesh(mesh, false);
        mesh.parent = parent;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.doNotSyncBoundingInfo = true;
        mesh.receiveShadows = false;
        this.mesh = mesh;

        HairView.registerShaders();
        const mat = new BABYLON.ShaderMaterial('hair-mat', scene, 'loryHair', {
            attributes: ['position', 'world0', 'world1', 'world2', 'world3', 'hDyn', 'hCol'],
            uniforms: ['world', 'viewProjection', 'cameraPosition', 'uTime', 'uTool', 'uToolPush', 'uPushP', 'uPushD', 'uSway',
                'uWidth', 'uGrav', 'uNeed', 'uNeedCol', 'uHead', 'uCapeC', 'uCapeR', 'uLightDir', 'uAmbient'],
        });
        mat.backFaceCulling = false;
        this.mat = mat;
        mesh.material = mat;
        const H = HairHead;
        mat.setVector2('uHead', new BABYLON.Vector2(H.IN, H.HR));
        mat.setVector3('uCapeC', new BABYLON.Vector3(H.CAPE_C[0], H.CAPE_C[1], H.CAPE_C[2]));
        mat.setVector3('uCapeR', new BABYLON.Vector3(H.CAPE_R[0], H.CAPE_R[1], H.CAPE_R[2]));
        mat.setVector3('uAmbient', new BABYLON.Vector3(1, 1, 1));
        this._apply();
        mesh.setEnabled(false);
    }

    static registerShaders() {
        if (BABYLON.Effect.ShadersStore.loryHairVertexShader) return;
        BABYLON.Effect.ShadersStore.loryHairVertexShader = HAIR_VERTEX;
        BABYLON.Effect.ShadersStore.loryHairFragmentShader = HAIR_FRAGMENT;
    }

    // Привязать причёску: буферы инстансов — массивы поля.
    /** @param {HairField} field */
    setField(field) {
        this.field = field;
        const m = this.mesh;
        m.thinInstanceSetBuffer('matrix', field.mat, 16, true);
        m.thinInstanceSetBuffer('hDyn', field.dyn, 4, false);
        m.thinInstanceSetBuffer('hCol', field.col, 3, false);
        field.dirty = false; field.colDirty = false;
        this.mat.setFloat('uGrav', field.grav);
        this.setLod(this.full);
        m.setEnabled(true);
    }

    // full — все пряди (крупный план), иначе — подвыборка потолще (салон).
    setLod(full) {
        this.full = !!full;
        const f = this.field;
        if (!f) return;
        const n = f.count || f.n;
        this.mesh.thinInstanceCount = full ? n : Math.max(1, Math.floor(n / this.lodDiv));
        this.mat.setFloat('uWidth', full ? 1 : Math.sqrt(this.lodDiv) * 1.05);
    }

    setVisible(on) { this.mesh.setEnabled(!!on && !!this.field); }

    // Инструмент у волос: точка (hu, координаты головы), радиус и сила раздвигания.
    setTool(x, y, z, radius, push) { this.tool[0] = x; this.tool[1] = y; this.tool[2] = z; this.tool[3] = radius; this.toolPush = push; }

    // След: волосы у точки качнутся в сторону (dx, dy, dz) и вернутся с затухающими колебаниями.
    addPush(x, y, z, dx, dy, dz, r) {
        const p = { x, y, z, r, dx, dy, dz, age: 0 };
        if (this.pushers.length < HAIR_PUSHERS) this.pushers.push(p);
        else { this.pushers[this._slot] = p; this._slot = (this._slot + 1) % HAIR_PUSHERS; }
    }

    // Толчок всей причёски (шаг, кивок, клиент вздрогнул).
    kick(x, y, z) { this.swayV[0] += x; this.swayV[1] += y; this.swayV[2] += z; }

    update(dt) {
        this.time += dt;
        const f = this.field;
        if (!f || !this.mesh.isEnabled()) return;
        if (f.dirty) { this.mesh.thinInstanceBufferUpdated('hDyn'); f.dirty = false; }
        if (f.colDirty) { this.mesh.thinInstanceBufferUpdated('hCol'); f.colDirty = false; }
        // пружина качания
        const k = 150, c = 9, h = Math.min(dt, 0.033);
        for (let i = 0; i < 3; i++) {
            this.swayV[i] += (-k * this.sway[i] - c * this.swayV[i]) * h;
            this.sway[i] += this.swayV[i] * h;
        }
        // следы
        const P = this.pushP, D = this.pushD;
        for (let i = 0; i < HAIR_PUSHERS; i++) {
            const p = this.pushers[i], o = i * 4;
            if (!p) { P[o + 3] = 0.0001; D[o] = D[o + 1] = D[o + 2] = 0; continue; }
            p.age += dt;
            const a = Math.exp(-p.age * 4.2) * Math.cos(p.age * 17);
            P[o] = p.x; P[o + 1] = p.y; P[o + 2] = p.z; P[o + 3] = p.r;
            D[o] = p.dx * a; D[o + 1] = p.dy * a; D[o + 2] = p.dz * a;
        }
        this._apply();
    }

    _apply() {
        const m = this.mat;
        m.setFloat('uTime', this.time);
        m.setVector4('uTool', new BABYLON.Vector4(this.tool[0], this.tool[1], this.tool[2], Math.max(0.0001, this.tool[3])));
        m.setFloat('uToolPush', this.toolPush);
        m.setArray4('uPushP', this.pushP);
        m.setArray4('uPushD', this.pushD);
        m.setVector3('uSway', new BABYLON.Vector3(this.sway[0], this.sway[1], this.sway[2]));
        m.setFloat('uNeed', this.showNeed);
        m.setVector3('uNeedCol', new BABYLON.Vector3(this.needCol[0], this.needCol[1], this.needCol[2]));
        const sun = typeof World3D !== 'undefined' && World3D.sunDirection ? World3D.sunDirection(World3D.cfg()) : null;
        // sunDirection — куда светит солнце; шейдеру нужно направление К свету
        if (sun) m.setVector3('uLightDir', new BABYLON.Vector3(-sun.x, -sun.y, -sun.z));
        else m.setVector3('uLightDir', new BABYLON.Vector3(0.4, 0.8, 0.45));
    }

    dispose() {
        this.mesh.dispose();
        this.mat.dispose();
        this.field = null;
    }
}

// ---------------------------------------------------------------------------------------------
// HairClumps — срезанные клочки
// ---------------------------------------------------------------------------------------------
// Координаты — единицы персонажа (cu) в системе корня клиента: y вверх, пол на floorY.
// Коллайдеры — скруглённые коробки { cx, cy, cz, hx, hy, hz, r, body: true } (голова, плечи,
// колени под накидкой, кресло). Состояния: 1 — летит, 2 — лежит на клиенте (ждёт щётку), 3 — лежит на
// полу, 4 — упал на клиента и тает (обычный клочок: на накидке остаются только отмеченные keep).
const CLUMP_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
attribute vec4 world0;
attribute vec4 world1;
attribute vec4 world2;
attribute vec4 world3;
attribute vec4 cCol;
uniform mat4 world;
uniform mat4 viewProjection;
uniform float uGlow;
varying vec3 vColor;
varying vec3 vNw;
void main() {
    mat4 inst = mat4(world0, world1, world2, world3);
    vec4 wp = world * inst * vec4(position, 1.0);
    gl_Position = viewProjection * wp;
    vNw = mat3(world) * mat3(inst) * normal;
    vColor = mix(cCol.rgb, vec3(1.0, 0.82, 0.18), cCol.a * uGlow);
}
`;
const CLUMP_FRAGMENT = `
precision highp float;
uniform vec3 uLightDir;
varying vec3 vColor;
varying vec3 vNw;
void main() {
    float d = abs(dot(normalize(vNw), normalize(uLightDir)));
    gl_FragColor = vec4(vColor * (0.82 + 0.42 * d), 1.0);
}
`;

class HairClumps {
    constructor(scene, parent, max) {
        this.max = max;
        this.n = 0;
        this.pos = new Float32Array(max * 3);
        this.vel = new Float32Array(max * 3);
        this.rot = new Float32Array(max * 3);
        this.spin = new Float32Array(max * 3);
        this.size = new Float32Array(max);
        this.state = new Uint8Array(max);
        this.rest = new Float32Array(max);       // секунд без движения
        this.keep = new Uint8Array(max);         // 1 — остаётся лежать на клиенте, пока не сметут щёткой
        this.glow = 0;                           // подсветка таких клочков (фаза «смети волосы»)
        this.time = 0;
        this.matrices = new Float32Array(max * 16);
        this.colors = new Float32Array(max * 4);
        /** @type {{ cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, r: number, body?: boolean }[]} */
        this.colliders = [];
        this.floorY = -4;
        this.gravity = 15;
        this._next = 0;
        this._dirty = true;
        /** упал на пол в этом кадре: счётчик для звука/эффектов */
        this.landed = 0;
        this.brushed = 0;

        const mesh = HairClumps.tuftMesh(scene);
        mesh.parent = parent;
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;
        mesh.doNotSyncBoundingInfo = true;
        if (!BABYLON.Effect.ShadersStore.loryClumpVertexShader) {
            BABYLON.Effect.ShadersStore.loryClumpVertexShader = CLUMP_VERTEX;
            BABYLON.Effect.ShadersStore.loryClumpFragmentShader = CLUMP_FRAGMENT;
        }
        const mat = new BABYLON.ShaderMaterial('clump-mat', scene, 'loryClump', {
            attributes: ['position', 'normal', 'world0', 'world1', 'world2', 'world3', 'cCol'],
            uniforms: ['world', 'viewProjection', 'uLightDir', 'uGlow'],
        });
        mat.backFaceCulling = false;
        const sun = typeof World3D !== 'undefined' && World3D.sunDirection ? World3D.sunDirection(World3D.cfg()) : null;
        mat.setVector3('uLightDir', sun ? new BABYLON.Vector3(-sun.x, -sun.y, -sun.z) : new BABYLON.Vector3(0.4, 0.8, 0.45));
        mesh.material = mat;
        this.mesh = mesh; this.mat = mat;
        mesh.thinInstanceSetBuffer('matrix', this.matrices, 16, false);
        mesh.thinInstanceSetBuffer('cCol', this.colors, 4, false);
        mesh.thinInstanceCount = 0;
        mesh.setEnabled(false);
    }

    // Пучок из нескольких изогнутых волосков (общая геометрия всех клочков).
    static tuftMesh(scene) {
        const rnd = HairUtil.rng(77);
        const pos = [], idx = [], nor = [];
        const hairs = 7, seg = 3;
        for (let h = 0; h < hairs; h++) {
            const a = rnd() * Math.PI * 2, len = 0.12 + rnd() * 0.14, bend = (rnd() - 0.5) * 1.6;
            const ox = (rnd() - 0.5) * 0.09, oz = (rnd() - 0.5) * 0.09, oy = (rnd() - 0.5) * 0.03;
            const dx = Math.cos(a), dz = Math.sin(a), w = 0.011 + rnd() * 0.008;
            const base = pos.length / 3;
            for (let i = 0; i <= seg; i++) {
                const t = i / seg - 0.5, ang = a + bend * t;
                const cx = ox + dx * len * t + Math.cos(ang + 1.57) * bend * 0.03 * (t * t * 4 - 1);
                const cz = oz + dz * len * t + Math.sin(ang + 1.57) * bend * 0.03 * (t * t * 4 - 1);
                const cy = oy + (0.25 - t * t) * 0.05 * (h % 2 ? 1 : -0.4);
                const sx = -Math.sin(ang) * w * (1 - Math.abs(t) * 1.3), sz = Math.cos(ang) * w * (1 - Math.abs(t) * 1.3);
                pos.push(cx - sx, cy, cz - sz, cx + sx, cy, cz + sz);
                nor.push(0, 1, 0, 0, 1, 0);
            }
            for (let i = 0; i < seg; i++) { const b = base + i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
        }
        const mesh = new BABYLON.Mesh('hair-clumps', scene);
        const vd = new BABYLON.VertexData();
        vd.positions = pos; vd.indices = idx; vd.normals = nor;
        vd.applyToMesh(mesh, false);
        return mesh;
    }

    clear() { this.n = 0; this._next = 0; this.state.fill(0); this.mesh.thinInstanceCount = 0; this.mesh.setEnabled(false); }

    // Новый клочок; при переполнении заменяется самый старый.
    spawn(x, y, z, vx, vy, vz, r, g, b, size, keep) {
        let i;
        if (this.n < this.max) i = this.n++;
        else { i = this._next; this._next = (this._next + 1) % this.max; }
        const o = i * 3;
        this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z;
        this.vel[o] = vx; this.vel[o + 1] = vy; this.vel[o + 2] = vz;
        this.rot[o] = Math.random() * 6.28; this.rot[o + 1] = Math.random() * 6.28; this.rot[o + 2] = Math.random() * 6.28;
        this.spin[o] = (Math.random() - 0.5) * 14; this.spin[o + 1] = (Math.random() - 0.5) * 14; this.spin[o + 2] = (Math.random() - 0.5) * 14;
        this.size[i] = size; this.state[i] = 1; this.rest[i] = 0; this.keep[i] = keep ? 1 : 0;
        const c = i * 4, k = 0.72 + Math.random() * 0.3;
        this.colors[c] = r * k; this.colors[c + 1] = g * k; this.colors[c + 2] = b * k; this.colors[c + 3] = keep ? 1 : 0;
        this.mesh.setEnabled(true);
        this._dirty = true;
        return i;
    }

    // Сколько клочков где: { flying, body, floor }.
    counts() {
        let flying = 0, body = 0, floor = 0;
        for (let i = 0; i < this.n; i++) { const s = this.state[i]; if (s === 1) flying++; else if (s === 2) body++; else if (s === 3) floor++; }
        return { flying, body, floor };
    }

    // Щётка у точки (cu): клочки, лежащие на клиенте в радиусе, слетают по ходу щётки.
    brush(x, y, z, radius, vx, vy, vz) {
        let hit = 0;
        const r2 = radius * radius;
        for (let i = 0; i < this.n; i++) {
            if (this.state[i] !== 2) continue;
            const o = i * 3, dx = this.pos[o] - x, dy = this.pos[o + 1] - y, dz = this.pos[o + 2] - z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > r2) continue;
            const l = Math.sqrt(d2) || 1, out = 1.6 + Math.random() * 1.6;
            this.vel[o] = vx * 0.55 + dx / l * out + (Math.random() - 0.5);
            this.vel[o + 1] = Math.abs(vy) * 0.3 + 1.6 + Math.random() * 1.8;
            this.vel[o + 2] = vz * 0.55 + dz / l * out + (Math.random() - 0.5) + 0.8;
            this.spin[o] = (Math.random() - 0.5) * 16; this.spin[o + 1] = (Math.random() - 0.5) * 16; this.spin[o + 2] = (Math.random() - 0.5) * 16;
            this.state[i] = 1; this.rest[i] = 0; this.keep[i] = 0; this.colors[i * 4 + 3] = 0; this.brushed = (this.brushed || 0) + 1;
            hit++;
        }
        return hit;
    }

    // Убрать клочки с пола в радиусе (метла в салоне). Возвращает число убранных.
    sweepFloor(x, z, radius) {
        let hit = 0;
        const r2 = radius * radius;
        for (let i = 0; i < this.n; i++) {
            if (this.state[i] !== 3) continue;
            const o = i * 3, dx = this.pos[o] - x, dz = this.pos[o + 2] - z;
            if (dx * dx + dz * dz > r2) continue;
            this.state[i] = 0; this.size[i] = 0; hit++;
        }
        if (hit) this._dirty = true;
        return hit;
    }

    update(dt) {
        const n = this.n;
        if (!n) return;
        this.landed = 0;
        const h = Math.min(dt, 0.033), g = this.gravity, cols = this.colliders, fy = this.floorY;
        const pos = this.pos, vel = this.vel, rot = this.rot, spin = this.spin;
        const gr = HairClumps._g;
        let moved = this._dirty;
        this.time += dt;
        this.mat.setFloat('uGlow', this.glow * (0.5 + 0.3 * Math.sin(this.time * 6)));
        for (let i = 0; i < n; i++) {
            if (this.state[i] === 4) {
                // обычный клочок на накидке: полежал — и растаял
                this.rest[i] += h; moved = true;
                if (this.rest[i] > 1.1) { this.size[i] *= Math.exp(-7 * h); if (this.size[i] < 0.06) { this.state[i] = 0; this.size[i] = 0; } }
                continue;
            }
            if (this.state[i] !== 1) continue;
            moved = true;
            const o = i * 3, rad = 0.07 * this.size[i];
            // лёгкий клочок: сильное сопротивление воздуха и «порхание»
            const drag = Math.exp(-2.6 * h);
            vel[o] = vel[o] * drag + Math.sin(rot[o + 1] * 1.7 + i) * 0.9 * h;
            vel[o + 1] = (vel[o + 1] - g * h) * drag;
            vel[o + 2] = vel[o + 2] * drag + Math.cos(rot[o] * 1.3 + i) * 0.9 * h;
            pos[o] += vel[o] * h; pos[o + 1] += vel[o + 1] * h; pos[o + 2] += vel[o + 2] * h;
            rot[o] += spin[o] * h; rot[o + 1] += spin[o + 1] * h; rot[o + 2] += spin[o + 2] * h;
            let onBody = false, hitN = 0;
            for (let c = 0; c < cols.length; c++) {
                const b = cols[c];
                const lx = pos[o] - b.cx, ly = pos[o + 1] - b.cy, lz = pos[o + 2] - b.cz;
                const qx = Math.abs(lx) - (b.hx - b.r), qy = Math.abs(ly) - (b.hy - b.r), qz = Math.abs(lz) - (b.hz - b.r);
                const mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0, mz = qz > 0 ? qz : 0;
                const l = Math.sqrt(mx * mx + my * my + mz * mz);
                const d = l + Math.min(Math.max(qx, qy, qz), 0) - b.r;
                if (d >= rad) continue;
                const sx = lx < 0 ? -1 : 1, sy = ly < 0 ? -1 : 1, sz = lz < 0 ? -1 : 1;
                if (l > 1e-6) { gr[0] = sx * mx / l; gr[1] = sy * my / l; gr[2] = sz * mz / l; }
                else if (qx > qy && qx > qz) { gr[0] = sx; gr[1] = 0; gr[2] = 0; }
                else if (qy > qz) { gr[0] = 0; gr[1] = sy; gr[2] = 0; }
                else { gr[0] = 0; gr[1] = 0; gr[2] = sz; }
                const push = rad - d;
                pos[o] += gr[0] * push; pos[o + 1] += gr[1] * push; pos[o + 2] += gr[2] * push;
                const vn = vel[o] * gr[0] + vel[o + 1] * gr[1] + vel[o + 2] * gr[2];
                if (vn < 0) {
                    // без отскока, трение по касательной — сильнее на пологом
                    const fr = gr[1] > 0.55 ? 0.35 : 0.9;
                    vel[o] = (vel[o] - gr[0] * vn) * fr; vel[o + 1] = (vel[o + 1] - gr[1] * vn) * fr; vel[o + 2] = (vel[o + 2] - gr[2] * vn) * fr;
                    spin[o] *= 0.6; spin[o + 1] *= 0.6; spin[o + 2] *= 0.6;
                }
                if (gr[1] > 0.55) { onBody = !!b.body; hitN = 1; }
            }
            if (pos[o + 1] < fy + rad * 0.4) {
                pos[o + 1] = fy + rad * 0.4;
                vel[o] *= 0.5; vel[o + 2] *= 0.5; vel[o + 1] = 0;
                this.state[i] = 3; this.landed++;
                rot[o] = 0; rot[o + 2] = 0;      // на полу лежит плашмя
                continue;
            }
            if (hitN) {
                const sp2 = vel[o] * vel[o] + vel[o + 1] * vel[o + 1] + vel[o + 2] * vel[o + 2];
                if (sp2 < 0.09) { this.rest[i] += h; if (this.rest[i] > 0.18) { this.state[i] = onBody ? (this.keep[i] ? 2 : 4) : 3; this.rest[i] = 0; rot[o] *= 0.15; rot[o + 2] *= 0.15; if (!onBody) this.landed++; } }
                else this.rest[i] = 0;
            }
        }
        if (!moved) return;
        // матрицы инстансов
        const M = this.matrices;
        for (let i = 0; i < n; i++) {
            const o = i * 3, m = i * 16, s = this.state[i] ? this.size[i] : 0;
            const cx = Math.cos(rot[o]), sx = Math.sin(rot[o]), cy = Math.cos(rot[o + 1]), sy = Math.sin(rot[o + 1]), cz = Math.cos(rot[o + 2]), sz = Math.sin(rot[o + 2]);
            // R = Ry * Rx * Rz
            M[m] = (cy * cz + sy * sx * sz) * s; M[m + 1] = (cx * sz) * s; M[m + 2] = (-sy * cz + cy * sx * sz) * s; M[m + 3] = 0;
            M[m + 4] = (-cy * sz + sy * sx * cz) * s; M[m + 5] = (cx * cz) * s; M[m + 6] = (sy * sz + cy * sx * cz) * s; M[m + 7] = 0;
            M[m + 8] = (sy * cx) * s; M[m + 9] = (-sx) * s; M[m + 10] = (cy * cx) * s; M[m + 11] = 0;
            M[m + 12] = pos[o]; M[m + 13] = pos[o + 1]; M[m + 14] = pos[o + 2]; M[m + 15] = 1;
        }
        this.mesh.thinInstanceCount = n;
        this.mesh.thinInstanceBufferUpdated('matrix');
        this.mesh.thinInstanceBufferUpdated('cCol');
        this._dirty = false;
    }

    dispose() { this.mesh.dispose(); this.mat.dispose(); }
}
HairClumps._g = [0, 0, 0];
