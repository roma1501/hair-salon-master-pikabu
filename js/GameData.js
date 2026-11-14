// GameData.js — данные игры «Hair Salon Master»: насадки, инструменты, отросшие причёски,
// заказы клиентов, имена, реплики, предметы магазина, награды дня и тексты (ключи g.*).

// Длина насадки в «головных» единицах (hu). Для наглядности чуть крупнее реальных мм.
const GAME_GUARDS = [
    { id: 'g0', mm: 0, len: 0, level: 1, icon: 'assets/ui/guard_0.webp' },
    { id: 'g3', mm: 3, len: 0.045, level: 1, icon: 'assets/ui/guard_3.webp' },
    { id: 'g10', mm: 10, len: 0.12, level: 2, icon: 'assets/ui/guard_10.webp' },
    { id: 'g19', mm: 19, len: 0.21, level: 3, icon: 'assets/ui/guard_19.webp' },
];

const GAME_TOOLS = [
    { id: 'clipper', level: 1, icon: 'assets/ui/tool_clipper.webp' },
    { id: 'scissors', level: 2, icon: 'assets/ui/tool_scissors.webp' },
    { id: 'brush', level: 1, icon: 'assets/ui/tool_brush.webp' },
];

// Опыт до следующего уровня: уровень n -> n+1.
const GAME_XP = [0, 20, 60, 120, 200, 300, 420, 560, 720, 900, 1100, 1350];

// --- отросшие причёски (с чем клиент приходит) ---
const GAME_HAIRSTYLES = {
    mop: { noise: 0.25, curl: 0.02, thick: 0.1, flow: 'crown', len: { top: 0.5, front: 0.42, side: 0.5, back: 0.58 }, lay: { top: 0.6, front: 0.7, side: 0.8, back: 0.8 } },
    shag: { noise: 0.32, curl: 0.05, thick: 0.12, flow: 'crown', len: { top: 0.44, front: 0.36, side: 0.62, back: 0.7 }, lay: { top: 0.55, front: 0.65, side: 0.85, back: 0.85 } },
    afro: { noise: 0.14, curl: 0.13, thick: 0.02, flow: 'up', width: 0.034, len: { top: 0.42, front: 0.36, side: 0.4, back: 0.42 }, lay: { top: 0.05, front: 0.05, side: 0.08, back: 0.08 } },
    slick: { noise: 0.2, curl: 0.01, thick: 0.08, flow: 'back', len: { top: 0.52, front: 0.46, side: 0.34, back: 0.44 }, lay: { top: 0.72, front: 0.6, side: 0.82, back: 0.85 } },
    side: { noise: 0.22, curl: 0.03, thick: 0.1, flow: 'side', len: { top: 0.5, front: 0.48, side: 0.42, back: 0.5 }, lay: { top: 0.66, front: 0.7, side: 0.8, back: 0.82 } },
    spiky: { noise: 0.3, curl: 0.0, thick: 0.03, flow: 'up', width: 0.036, len: { top: 0.4, front: 0.34, side: 0.26, back: 0.28 }, lay: { top: 0.1, front: 0.16, side: 0.3, back: 0.3 } },
    bowl: { noise: 0.12, curl: 0.01, thick: 0.11, flow: 'crown', len: { top: 0.56, front: 0.52, side: 0.46, back: 0.46 }, lay: { top: 0.7, front: 0.78, side: 0.85, back: 0.85 } },
};
const GAME_BEARDS = { none: 0, stubble: 0.1, full: 0.3, long: 0.5 };
const GAME_HAIR_COLORS = ['#2b1b12', '#4a2c17', '#7a4a1c', '#a8672b', '#d9a441', '#ead7a4', '#b5452a', '#8a8f96'];
const GAME_FUN_COLORS = ['#ff5fa2', '#3aa0ff', '#58c96b', '#9a6bff', '#ff9d2e', '#22c7c0'];
const GAME_SHIRTS = ['#e85d75', '#f2a541', '#58b368', '#4a90d9', '#9b6bd6', '#3fbfbf', '#d95f43', '#8d99ae', '#f4d35e', '#6c8e5a'];
const GAME_PANTS = ['#2a3550', '#3b3b46', '#5b4636', '#27455c', '#4a5a3c', '#6b3f55'];

// --- заказы ---
// zones — правила HairField.setTargets; strand(x, y, z, zone) — правило отдельной пряди (перекрывает зону);
// level — с какого уровня мастера встречается; pay — базовая оплата; beard — нужен клиент с бородой;
// tool/guard — чем делать (подсказка в карточке); minLen — причёска клиента должна быть не короче.
const _G = { g0: 0, g3: 0.045, g10: 0.12, g19: 0.21 };
const _KEEP = { keep: 0.8, weight: 0.6 };
const GAME_REQUESTS = [
    { id: 'bald', level: 1, pay: 40, tool: 'clipper', guard: 'g0',
        zones: { top: { max: 0 }, front: { max: 0 }, side: { max: 0 }, back: { max: 0 } } },
    { id: 'buzz3', level: 1, pay: 46, tool: 'clipper', guard: 'g3',
        zones: { top: { max: _G.g3, min: 0.02 }, front: { max: _G.g3, min: 0.02 }, side: { max: _G.g3, min: 0.02 }, back: { max: _G.g3, min: 0.02 } } },
    { id: 'undercut', level: 1, pay: 52, tool: 'clipper', guard: 'g0',
        zones: { top: _KEEP, front: _KEEP, side: { max: 0 }, back: { max: 0 } } },
    { id: 'beardoff', level: 1, pay: 44, tool: 'clipper', guard: 'g0', beard: true,
        zones: { top: _KEEP, front: _KEEP, side: _KEEP, back: _KEEP, beard: { max: 0, weight: 2.4 } } },
    { id: 'buzz10', level: 2, pay: 58, tool: 'clipper', guard: 'g10',
        zones: { top: { max: _G.g10, min: 0.06 }, front: { max: _G.g10, min: 0.06 }, side: { max: _G.g10, min: 0.06 }, back: { max: _G.g10, min: 0.06 } } },
    { id: 'crew', level: 2, pay: 70, tool: 'clipper', guard: 'g10',
        zones: { top: { max: _G.g10, min: 0.06 }, front: { max: _G.g10, min: 0.06 }, side: { max: _G.g3, min: 0.02 }, back: { max: _G.g3, min: 0.02 } } },
    { id: 'fringe', level: 2, pay: 62, tool: 'scissors',
        zones: { top: _KEEP, front: { max: 0.2, min: 0.07, weight: 2.2 }, side: _KEEP, back: _KEEP } },
    { id: 'trim', level: 2, pay: 74, tool: 'scissors',
        zones: { top: { max: 0.33, min: 0.1 }, front: { max: 0.3, min: 0.08 }, side: { max: 0.33, min: 0.1 }, back: { max: 0.36, min: 0.1 } } },
    { id: 'mohawk', level: 2, pay: 82, tool: 'clipper', guard: 'g0',
        zones: { top: _KEEP, front: _KEEP, side: { max: 0 }, back: { max: 0 } },
        strand: (x, y, z, zone) => (zone === 5 ? null : Math.abs(x) < 0.2 ? { keep: 0.8, weight: 1.3 } : { max: 0 }) },
    { id: 'beardtrim', level: 2, pay: 60, tool: 'clipper', guard: 'g10', beard: true,
        zones: { top: _KEEP, front: _KEEP, side: _KEEP, back: _KEEP, beard: { max: _G.g10, min: 0.05, weight: 2.4 } } },
    { id: 'short19', level: 3, pay: 78, tool: 'clipper', guard: 'g19',
        zones: { top: { max: _G.g19, min: 0.12 }, front: { max: _G.g19, min: 0.12 }, side: { max: _G.g10, min: 0.06 }, back: { max: _G.g10, min: 0.06 } } },
    { id: 'monk', level: 3, pay: 90, tool: 'clipper', guard: 'g0',
        zones: { top: { max: 0, weight: 1.6 }, front: _KEEP, side: _KEEP, back: _KEEP } },
    { id: 'fade', level: 3, pay: 104, tool: 'clipper', guard: 'g3',
        zones: { top: { max: _G.g19, min: 0.12 }, front: { max: _G.g19, min: 0.12 }, side: { max: _G.g3 }, back: { max: _G.g3 } },
        strand: (x, y, z, zone) => (zone === 2 || zone === 3 || zone === 4 ? (y < 0.12 ? { max: 0 } : { max: _G.g3, min: 0.02 }) : undefined) },
    { id: 'goatee', level: 4, pay: 96, tool: 'clipper', guard: 'g0', beard: true,
        zones: { top: _KEEP, front: _KEEP, side: _KEEP, back: _KEEP, beard: { max: 0, weight: 2 } },
        strand: (x, y, z, zone) => (zone === 5 ? (Math.abs(x) < 0.3 && z > 0.3 ? { keep: 0.75, weight: 2 } : { max: 0, weight: 2 }) : undefined) },
    { id: 'allclean', level: 4, pay: 110, tool: 'clipper', guard: 'g0', beard: true,
        zones: { top: { max: 0 }, front: { max: 0 }, side: { max: 0 }, back: { max: 0 }, beard: { max: 0 } } },
];

const GAME_NAMES = {
    ru: ['Вася', 'Гоша', 'Тимур', 'Лёва', 'Макс', 'Сеня', 'Боря', 'Федя', 'Марк', 'Яша', 'Гена', 'Платон', 'Захар', 'Мирон', 'Эдик', 'Рома', 'Саня', 'Юра', 'Костя', 'Денис'],
    en: ['Walt', 'Tony', 'Milo', 'Gus', 'Benny', 'Otis', 'Hank', 'Leo', 'Max', 'Finn', 'Duke', 'Ray', 'Sam', 'Theo', 'Ollie', 'Rex', 'Ned', 'Cody', 'Jay', 'Kirk'],
};

// --- магазин: треть косметики — за заработанные деньги, остальное — за просмотры рекламы (1–5 на предмет) ---
// preview — мини-картинка карточки; цвета и узор читает игра (Game.applyLook).
const GAME_SHOP_TABS = [
    { id: 'skin', name: { ru: 'Скины', en: 'Skins' }, icon: 'assets/ui/tab_outfit.webp' },
    { id: 'clipper', name: { ru: 'Машинки', en: 'Clippers' }, icon: 'assets/ui/tool_clipper.webp' },
    { id: 'cape', name: { ru: 'Накидки', en: 'Capes' }, icon: 'assets/ui/tab_cape.webp' },
    { id: 'chair', name: { ru: 'Кресла', en: 'Chairs' }, icon: 'assets/ui/icon_chair.webp' },
    { id: 'salon', name: { ru: 'Салон', en: 'Salon' }, icon: 'assets/ui/tab_salon.webp' },
];
// Палитры предметов: [id, название ru, en, основной, второй, акцент]
const GAME_PALETTES = [
    ['aqua', 'Бирюза', 'Aqua', '#23c4c9', '#ff6b6b', '#ffd23f'],
    ['cherry', 'Вишня', 'Cherry', '#e63950', '#ffd23f', '#fff4e0'],
    ['lime', 'Лайм', 'Lime', '#8bd93f', '#27314f', '#ffffff'],
    ['royal', 'Королевский', 'Royal', '#5b4bd6', '#ffd23f', '#fff4e0'],
    ['sunny', 'Солнце', 'Sunny', '#ffd23f', '#ff9d2e', '#27314f'],
    ['night', 'Полночь', 'Midnight', '#1c2140', '#23c4c9', '#ff6b6b'],
    ['rose', 'Роза', 'Rose', '#ff7aa8', '#fff4e0', '#e3b04b'],
    ['mint', 'Мята', 'Mint', '#7fdcc2', '#2f6f6a', '#ffffff'],
    ['peach', 'Персик', 'Peach', '#ffb38a', '#b85c3b', '#fff4e0'],
    ['sky', 'Небо', 'Sky', '#7cc4ff', '#27455c', '#ffffff'],
    ['grape', 'Виноград', 'Grape', '#7b5bd6', '#ffd23f', '#d9e6ef'],
    ['flame', 'Пламя', 'Flame', '#ff6a2e', '#27314f', '#ffd23f'],
    ['forest', 'Лес', 'Forest', '#2f5d3a', '#8bd93f', '#e6f2d9'],
    ['ocean', 'Океан', 'Ocean', '#1f6fb5', '#7fe0ff', '#fff4e0'],
    ['candy', 'Карамель', 'Candy', '#ffa3d1', '#9fe8ff', '#7b3fd6'],
    ['choco', 'Шоколад', 'Chocolate', '#6b4226', '#f2c9a0', '#ffd23f'],
    ['snow', 'Снежок', 'Snow', '#eef2fb', '#7cc4ff', '#27314f'],
    ['neon', 'Неон', 'Neon', '#39e58a', '#ff3df0', '#1c2140'],
    ['gold', 'Золото', 'Gold', '#f0b429', '#fff4e0', '#27314f'],
    ['galaxy', 'Галактика', 'Galaxy', '#3b2a8f', '#c44fd9', '#ffd23f'],
];
const GAME_RARITY = ['common', 'common', 'common', 'common', 'common', 'common', 'uncommon', 'uncommon', 'uncommon', 'uncommon', 'uncommon',
    'rare', 'rare', 'rare', 'rare', 'epic', 'epic', 'epic', 'legendary', 'legendary'];
const GAME_PRICES = [0, 60, 90, 120, 150, 190, 260, 320, 380, 450, 520, 700, 850, 1000, 1200, 1600, 2000, 2400, 3200, 4200];
// Просмотров рекламы за предмет по редкости (чем ценнее, тем больше).
const GAME_AD_VIEWS = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
// Цена предмета i во вкладке: первый — бесплатный, каждый третий — за деньги, остальные — за рекламу.
const _price = (i, coins) => (i === 0 || i % 3 === 1 ? { coins } : { ads: GAME_AD_VIEWS[GAME_RARITY[i]] });
const GAME_CAPE_PATTERNS = ['stripes', 'plain', 'wide', 'hem'];
const GAME_FLOOR_PATTERNS = ['checker', 'diamond', 'stripes', 'dots'];

// Скины мастера: внешность целиком — кожа, причёска и борода, форма, фартук.
// hair: { style — основа из GAME_HAIRSTYLES, k — длина относительно основы, color, color2 (пряди), beard, shape }
//   shape: 'mohawk' — полоса по центру, 'sides' — лысая макушка, 'bald' — без волос.
/** @type {any[][]} */
const GAME_SKINS = [
    ['classic', 'Мастер', 'Barber', '#f6c79a', { style: 'side', k: 0.6, color: '#3a2a1f', beard: 'none' }, '#fff4e0', '#27314f', '#23c4c9'],
    ['blond', 'Блондин', 'Blondie', '#ffd9b0', { style: 'mop', k: 0.62, color: '#ead7a4', beard: 'none' }, '#a9dcff', '#27455c', '#ff6b6b'],
    ['ginger', 'Рыжик', 'Ginger', '#ffe2c6', { style: 'spiky', k: 0.8, color: '#d2562a', beard: 'stubble' }, '#bfeee0', '#3b3b46', '#ffd23f'],
    ['curly', 'Кудряш', 'Curly', '#a06a44', { style: 'afro', k: 0.8, color: '#2b1b12', beard: 'none' }, '#ffd3b8', '#27314f', '#5b4bd6'],
    ['hipster', 'Хипстер', 'Hipster', '#f6c79a', { style: 'slick', k: 0.62, color: '#4a2c17', beard: 'full' }, '#f2a541', '#5b4636', '#2f5d3a'],
    ['student', 'Студент', 'Student', '#e8b282', { style: 'bowl', k: 0.6, color: '#2b1b12', beard: 'none' }, '#58b368', '#27455c', '#fff4e0'],
    ['strong', 'Силач', 'Strongman', '#c98d5e', { style: 'side', k: 0.5, color: '#2b1b12', beard: 'full', shape: 'bald' }, '#2b2b33', '#16161c', '#b3202a'],
    ['oldpro', 'Дед-мастер', 'Old pro', '#ffd9b0', { style: 'shag', k: 0.5, color: '#b9bec6', beard: 'long', shape: 'sides' }, '#e6e6ef', '#6b3f55', '#8d99ae'],
    ['surfer', 'Сёрфер', 'Surfer', '#e8b282', { style: 'shag', k: 0.75, color: '#f0d27a', beard: 'none' }, '#22c7c0', '#f4d35e', '#ff9d2e'],
    ['doctor', 'Доктор стиля', 'Style doctor', '#f6c79a', { style: 'side', k: 0.55, color: '#8a8f96', beard: 'stubble' }, '#ffffff', '#8d99ae', '#a9dcff'],
    ['pirate', 'Пират', 'Pirate', '#c98d5e', { style: 'shag', k: 0.85, color: '#16161c', beard: 'long' }, '#b3202a', '#27314f', '#16161c'],
    ['punk', 'Панк', 'Punk', '#ffd9b0', { style: 'spiky', k: 1.15, color: '#ff5fa2', beard: 'none', shape: 'mohawk' }, '#16161c', '#2b2b33', '#ff3d6e'],
    ['anime', 'Герой аниме', 'Anime hero', '#ffe2c6', { style: 'spiky', k: 1.0, color: '#3aa0ff', beard: 'none' }, '#ffffff', '#27314f', '#ff6b6b'],
    ['minty', 'Мятный', 'Minty', '#ffd9b0', { style: 'bowl', k: 0.68, color: '#58c96b', beard: 'none' }, '#fff4e0', '#2f6f6a', '#58c96b'],
    ['rock', 'Рок-звезда', 'Rock star', '#f6c79a', { style: 'shag', k: 1.0, color: '#16161c', color2: '#ff3d6e', beard: 'stubble' }, '#2b2b33', '#16161c', '#9a6bff'],
    ['ninja', 'Ниндзя', 'Ninja', '#e8b282', { style: 'slick', k: 0.5, color: '#16161c', beard: 'none' }, '#1c2140', '#16161c', '#3b4a7a'],
    ['zombie', 'Зомби', 'Zombie', '#9fd3a6', { style: 'mop', k: 0.7, color: '#2f5d3a', beard: 'none' }, '#6c8e5a', '#4a5a3c', '#5b4636'],
    ['robot', 'Робот', 'Robot', '#c9d3df', { style: 'side', k: 0.5, color: '#8d99ae', beard: 'none', shape: 'bald' }, '#8d99ae', '#566074', '#23c4c9'],
    ['rainbow', 'Радуга', 'Rainbow', '#ffd9b0', { style: 'mop', k: 0.8, color: '#ff5fa2', color2: '#3aa0ff', beard: 'none' }, '#ffe9a8', '#5b3fd6', '#c44fd9'],
    ['golden', 'Золотой', 'Golden', '#f0b429', { style: 'spiky', k: 0.9, color: '#ffd23f', beard: 'full' }, '#f0b429', '#b8860b', '#fff4e0'],
];
const GAME_SKIN_PRICES = [0, 150, 220, 300, 380, 460, 600, 750, 900, 1050, 1200, 1500, 1800, 2100, 2500, 3000, 3600, 4200, 5200, 6500];

const _mixHex = (hex, to, k) => {
    const a = HairUtil.rgb(hex), b = HairUtil.rgb(to), h = (v) => Math.round(HairUtil.clamp(v, 0, 1) * 255).toString(16).padStart(2, '0');
    return '#' + h(a[0] + (b[0] - a[0]) * k) + h(a[1] + (b[1] - a[1]) * k) + h(a[2] + (b[2] - a[2]) * k);
};
const GAME_SHOP_ITEMS = (() => {
    const out = [];
    const add = (tab, i, id, ru, en, colors, mult, extra) => out.push(Object.assign({
        id: tab + '_' + id, tab, name: { ru, en }, rarity: GAME_RARITY[i], price: _price(i, Math.round(GAME_PRICES[i] * mult / 10) * 10), colors,
        preview: { shape: tab === 'salon' ? 'wall' : tab, colors },
    }, i === 0 ? { default: true } : null, extra || null));
    GAME_SKINS.forEach((k, i) => {
        const hair = k[4], st = GAME_HAIRSTYLES[hair.style], f = hair.k;
        const bald = hair.shape === 'bald', sides = hair.shape === 'sides', moh = hair.shape === 'mohawk';
        out.push(Object.assign({
            id: 'skin_' + k[0], tab: 'skin', name: { ru: k[1], en: k[2] }, rarity: GAME_RARITY[i], price: _price(i, GAME_SKIN_PRICES[i]),
            look: { skin: k[3], shirt: k[5], pants: k[6], apron: k[7], shoes: '#30343a', sleeve: 'short' }, hair,
            preview: { shape: 'portrait', colors: [k[5], k[7], k[6]], portrait: { skin: k[3], hair: hair.color, mood: 'happy', len: {
                top: bald || sides ? 0 : st.len.top * f, front: bald || sides || moh ? 0 : st.len.front * f, side: bald || moh ? 0 : st.len.side * f,
                back: bald || moh ? 0 : st.len.back * f, beard: GAME_BEARDS[hair.beard] || 0 } } },
        }, i === 0 ? { default: true } : null));
    });
    GAME_PALETTES.forEach((p, i) => add('clipper', i, p[0], p[1], p[2], [p[3], p[4], p[5]], 1));
    GAME_PALETTES.forEach((p, i) => (i === 0
        ? add('cape', 0, 'white', 'Белая', 'White', ['#f4f6fb', '#dfe5f2', '#23c4c9'], 0.9, { pattern: 'stripes' })
        : add('cape', i, p[0], p[1], p[2], [_mixHex(p[3], '#ffffff', 0.18), p[4], p[5]], 0.9, { pattern: GAME_CAPE_PATTERNS[i % 4] })));
    GAME_PALETTES.forEach((p, i) => add('chair', i, p[0], p[1], p[2], [p[3], p[4], i % 2 ? '#d9e6ef' : '#e3b04b'], 1.2));
    GAME_PALETTES.forEach((p, i) => (i === 0
        ? add('salon', 0, 'lavender', 'Лаванда', 'Lavender', ['#c9c4f5', '#fff4e0', '#27314f'], 1.5, { pattern: 'checker' })
        : add('salon', i, p[0], p[1], p[2], [_mixHex(p[3], '#ffffff', 0.5), _mixHex(p[5], '#ffffff', 0.78), _mixHex(p[3], '#1c2140', 0.6)], 1.5, { pattern: GAME_FLOOR_PATTERNS[i % 4] })));
    return out;
})();
const GAME_DAILY = [{ coins: 40 }, { coins: 70 }, { coins: 110 }, { coins: 160 }, { coins: 230 }, { coins: 320 }];

// --- тексты игры (g.*) ---
Object.assign(LANG_STRINGS.ru, {
    'g.ctx.invite': 'Пригласить в кресло',
    'g.ctx.cut': 'Начать стрижку',
    'g.ctx.sweep': 'Подмести',
    'g.ctx.box': 'Открыть коробку',
    'g.ctx.busy': 'Кресло занято',
    'g.hello': ['Привет! Мне бы подстричься.', 'Здравствуйте! Свободно?', 'О, наконец-то салон!', 'Добрый день! Жду своей очереди.'],
    'g.seat': ['Спасибо! Сажусь.', 'Отлично, иду!', 'Ура, моя очередь!'],
    'g.bye': ['Спасибо, до встречи!', 'Загляну ещё!', 'Пока-пока!'],
    'g.mid': ['Продолжай!', 'Уже лучше!', 'Так-так, хорошо идёт!', 'Щекотно!'],
    'g.near': ['Почти готово!', 'Ещё чуть-чуть!', 'Вот это уже похоже!'],
    'g.over': ['Эй! Тут не надо было!', 'Ой! Слишком коротко!', 'Стоп-стоп, это лишнее!'],
    'g.eyes': ['Осторожно, глаза!', 'Аккуратнее у лица!'],
    'g.brush': ['Смахни с меня волосы!', 'Щётку, пожалуйста!'],
    'g.fled': ['Всё! С меня хватит, я ухожу!', 'Это кошмар! Ноги моей здесь не будет!', 'Хватит! Я лучше сам подстригусь!'],
    'g.fledBye': ['Больше никогда!', 'Ужасный салон!'],
    'g.calmed': ['Ладно… продолжай, только аккуратно.', 'Уф. Хорошо, даю ещё шанс.'],
    'g.res3': ['Невероятно! Именно то, что я хотел!', 'Шедевр! Я в восторге!', 'Лучшая стрижка в моей жизни!'],
    'g.res2': ['Очень неплохо, спасибо!', 'Хорошая работа!', 'Мне нравится!'],
    'g.res1': ['Ну… сойдёт.', 'Могло быть и лучше.', 'Хм. Ладно.'],
    'g.res0': ['Что это такое?!', 'Я просил совсем другое!', 'Верните мои волосы!'],
    'g.dirty': 'На полу волосы! Подмети — клиенты это ценят.',
    'g.clean': 'Чистота! +{n}',
    'g.newbox': 'Привезли коробку с новинками!',
    'g.unlock.scissors': 'Ножницы', 'g.unlock.scissors.t': 'Режут пряди там, где сомкнулись лезвия. Для чёлок и аккуратных стрижек.',
    'g.unlock.g10': 'Насадка 10 мм', 'g.unlock.g10.t': 'Оставляет короткий ровный «ёжик» подлиннее.',
    'g.unlock.g19': 'Насадка 19 мм', 'g.unlock.g19.t': 'Для коротких, но не бритых стрижек.',
    'g.unlock.clients': 'Новые заказы', 'g.unlock.clients.t': 'Клиенты станут просить стрижки посложнее.',
    'g.tool.clipper': 'Машинка', 'g.tool.scissors': 'Ножницы', 'g.tool.brush': 'Щётка',
    'g.guard.g0': '0 мм', 'g.guard.g3': '3 мм', 'g.guard.g10': '10 мм', 'g.guard.g19': '19 мм',
    'g.lock.level': 'Ур. {n}',
    'g.req.bald.t': 'Наголо', 'g.req.bald': 'Всё под ноль, пожалуйста! Машинкой без насадки.',
    'g.req.buzz3.t': 'Ёжик 3 мм', 'g.req.buzz3': 'Сделай ровный ёжик: насадка 3 мм по всей голове.',
    'g.req.undercut.t': 'Бока под ноль', 'g.req.undercut': 'Бока и затылок сбрей, а верх не трогай!',
    'g.req.beardoff.t': 'Сбрить бороду', 'g.req.beardoff': 'Бороду долой! Причёску оставь как есть.',
    'g.req.buzz10.t': 'Ёжик 10 мм', 'g.req.buzz10': 'Коротко, но не лысо: насадка 10 мм везде.',
    'g.req.crew.t': 'Спортивная', 'g.req.crew': 'Сверху 10 мм, бока и затылок — 3 мм.',
    'g.req.fringe.t': 'Подровнять чёлку', 'g.req.fringe': 'Чёлка лезет в глаза! Подрежь её ножницами, остальное оставь.',
    'g.req.trim.t': 'Освежить', 'g.req.trim': 'Просто укороти ножницами со всех сторон. Не слишком коротко!',
    'g.req.mohawk.t': 'Ирокез', 'g.req.mohawk': 'Хочу ирокез! Оставь полосу по центру, остальное сбрей.',
    'g.req.beardtrim.t': 'Бородка 10 мм', 'g.req.beardtrim': 'Бороду укороти до 10 мм, причёску не трогай.',
    'g.req.short19.t': 'Короткая', 'g.req.short19': 'Сверху 19 мм, по бокам и сзади — 10 мм.',
    'g.req.monk.t': 'Макушка', 'g.req.monk': 'Сбрей только макушку. Да, я серьёзно!',
    'g.req.fade.t': 'Фейд', 'g.req.fade': 'Сверху 19 мм, бока 3 мм, а самый низ — под ноль.',
    'g.req.goatee.t': 'Эспаньолка', 'g.req.goatee': 'Оставь бородку только на подбородке, щёки чисто.',
    'g.req.allclean.t': 'Всё сбрить', 'g.req.allclean': 'Сбрей всё: и волосы, и бороду. Начинаю новую жизнь!',
    'g.tut.walk.t': 'Иди к клиенту', 'g.tut.walk.h': 'Клиент ждёт у стены. Подойди к нему.',
    'g.tut.invite.t': 'Пригласи в кресло', 'g.tut.invite.h': 'Нажми кнопку действия рядом с клиентом.',
    'g.tut.start.t': 'Начни стрижку', 'g.tut.start.h': 'Подойди к креслу и нажми кнопку действия.',
    'g.tut.cut.t': 'Стриги!', 'g.tut.cut.h': 'Веди машинкой по волосам. Красным подсвечено то, что нужно срезать.',
    'g.tut.orbit.t': 'Поверни голову', 'g.tut.orbit.h': 'Тяни по пустому месту или жми стрелки, чтобы посмотреть сбоку и сзади.',
    'g.tut.done.t': 'Заверши работу', 'g.tut.done.h': 'Когда шкала дойдёт до звезды, жми «Готово».',
    'g.loading': 'Открываем салон…',
});
Object.assign(LANG_STRINGS.en, {
    'g.ctx.invite': 'Invite to the chair',
    'g.ctx.cut': 'Start haircut',
    'g.ctx.sweep': 'Sweep',
    'g.ctx.box': 'Open the box',
    'g.ctx.busy': 'Chair is taken',
    'g.hello': ['Hi! I need a haircut.', 'Hello! Are you open?', 'Finally, a salon!', 'Good day! I can wait.'],
    'g.seat': ['Thanks! Taking a seat.', 'Great, coming!', 'Yay, my turn!'],
    'g.bye': ['Thanks, see you!', 'I will be back!', 'Bye-bye!'],
    'g.mid': ['Keep going!', 'Looking better!', 'Nice, nice!', 'That tickles!'],
    'g.near': ['Almost there!', 'Just a little more!', 'Now we are talking!'],
    'g.over': ['Hey! Not there!', 'Ouch! Too short!', 'Stop, that was extra!'],
    'g.eyes': ['Watch my eyes!', 'Careful near the face!'],
    'g.brush': ['Brush the hair off me!', 'The brush, please!'],
    'g.fled': ['That is it! I am leaving!', 'A nightmare! I am never coming back!', 'Enough! I will cut it myself!'],
    'g.fledBye': ['Never again!', 'Terrible salon!'],
    'g.calmed': ['Fine… go on, but be careful.', 'Phew. Okay, one more chance.'],
    'g.res3': ['Incredible! Just what I wanted!', 'A masterpiece! I love it!', 'Best haircut of my life!'],
    'g.res2': ['Pretty good, thanks!', 'Nice work!', 'I like it!'],
    'g.res1': ['Well… it will do.', 'Could be better.', 'Hm. Okay.'],
    'g.res0': ['What is this?!', 'That is not what I asked for!', 'Give me my hair back!'],
    'g.dirty': 'Hair on the floor! Sweep it — customers notice.',
    'g.clean': 'Spotless! +{n}',
    'g.newbox': 'A box with new gear has arrived!',
    'g.unlock.scissors': 'Scissors', 'g.unlock.scissors.t': 'Cut strands right where the blades close. Great for fringes and tidy trims.',
    'g.unlock.g10': '10 mm guard', 'g.unlock.g10.t': 'Leaves a slightly longer, even buzz.',
    'g.unlock.g19': '19 mm guard', 'g.unlock.g19.t': 'For short but not shaved styles.',
    'g.unlock.clients': 'New requests', 'g.unlock.clients.t': 'Customers will ask for trickier haircuts.',
    'g.tool.clipper': 'Clipper', 'g.tool.scissors': 'Scissors', 'g.tool.brush': 'Brush',
    'g.guard.g0': '0 mm', 'g.guard.g3': '3 mm', 'g.guard.g10': '10 mm', 'g.guard.g19': '19 mm',
    'g.lock.level': 'Lv. {n}',
    'g.req.bald.t': 'Bald', 'g.req.bald': 'All of it, please! Clipper with no guard.',
    'g.req.buzz3.t': '3 mm buzz', 'g.req.buzz3': 'An even buzz cut: 3 mm guard all over.',
    'g.req.undercut.t': 'Shaved sides', 'g.req.undercut': 'Shave the sides and back, leave the top!',
    'g.req.beardoff.t': 'Shave the beard', 'g.req.beardoff': 'Beard off! Leave my hair as it is.',
    'g.req.buzz10.t': '10 mm buzz', 'g.req.buzz10': 'Short but not bald: 10 mm guard everywhere.',
    'g.req.crew.t': 'Crew cut', 'g.req.crew': '10 mm on top, 3 mm on the sides and back.',
    'g.req.fringe.t': 'Trim the fringe', 'g.req.fringe': 'My fringe is in my eyes! Snip it with scissors, keep the rest.',
    'g.req.trim.t': 'Freshen up', 'g.req.trim': 'Just shorten it all around with scissors. Not too short!',
    'g.req.mohawk.t': 'Mohawk', 'g.req.mohawk': 'I want a mohawk! Leave a strip in the middle, shave the rest.',
    'g.req.beardtrim.t': '10 mm beard', 'g.req.beardtrim': 'Trim the beard to 10 mm, do not touch the hair.',
    'g.req.short19.t': 'Short', 'g.req.short19': '19 mm on top, 10 mm on the sides and back.',
    'g.req.monk.t': 'Crown only', 'g.req.monk': 'Shave just the top. Yes, I am serious!',
    'g.req.fade.t': 'Fade', 'g.req.fade': '19 mm on top, 3 mm sides, and bald at the very bottom.',
    'g.req.goatee.t': 'Goatee', 'g.req.goatee': 'Leave the beard only on the chin, clean cheeks.',
    'g.req.allclean.t': 'Shave it all', 'g.req.allclean': 'Shave everything: hair and beard. New life starts today!',
    'g.tut.walk.t': 'Go to the customer', 'g.tut.walk.h': 'A customer is waiting by the wall. Walk up to them.',
    'g.tut.invite.t': 'Invite to the chair', 'g.tut.invite.h': 'Press the action button next to the customer.',
    'g.tut.start.t': 'Start the haircut', 'g.tut.start.h': 'Walk to the chair and press the action button.',
    'g.tut.cut.t': 'Cut!', 'g.tut.cut.h': 'Move the clipper over the hair. Red shows what has to go.',
    'g.tut.orbit.t': 'Turn the head', 'g.tut.orbit.h': 'Drag on empty space or press the arrows to see the sides and back.',
    'g.tut.done.t': 'Finish the job', 'g.tut.done.h': 'When the bar reaches a star, press “Done”.',
    'g.loading': 'Opening the salon…',
});

/** @satisfies {Record<string, any>} */
const GameData = {
    pick(list, rnd) { return list[Math.floor((rnd || Math.random)() * list.length) % list.length]; },
    // Случайная строка из списка-ключа Lang (значение ключа — массив строк).
    line(key, rnd) {
        const lang = (typeof Lang !== 'undefined' && Lang.code) || 'ru';
        const src = (LANG_STRINGS[lang] && LANG_STRINGS[lang][key]) || LANG_STRINGS.ru[key];
        return Array.isArray(src) ? GameData.pick(src, rnd) : String(src || key);
    },
    guard(id) { return GAME_GUARDS.find(g => g.id === id) || GAME_GUARDS[0]; },

    // Причёска скина мастера (стиль HairField) или null — лысый без бороды.
    skinHair(item) {
        const h = item && item.hair;
        if (!h) return null;
        const base = GAME_HAIRSTYLES[h.style] || GAME_HAIRSTYLES.side, k = h.k == null ? 0.6 : h.k;
        const beard = GAME_BEARDS[h.beard] || 0;
        if (h.shape === 'bald' && !beard) return null;
        const spec = Object.assign({}, base, {
            color: h.color, beard: beard > 0, width: 0.085, thick: (base.thick == null ? 0.1 : base.thick) * 0.6,
            len: { top: base.len.top * k, front: base.len.front * k, side: base.len.side * k, back: base.len.back * k, beard: beard * 0.9 },
            lay: Object.assign({}, base.lay, { beard: 0.45 }),
        });
        if (h.color2) { spec.color2 = h.color2; spec.streak = 0.4; }
        if (h.shape === 'mohawk') spec.shape = (x, y, z, zone) => (zone === 5 ? 1 : Math.abs(x) < 0.2 ? 1.4 : 0);
        else if (h.shape === 'sides') spec.shape = (x, y, z, zone) => (zone === 0 || zone === 1 ? 0 : 1);
        else if (h.shape === 'bald') spec.shape = (x, y, z, zone) => (zone === 5 ? 1 : 0);
        return spec;
    },
    request(id) { return GAME_REQUESTS.find(r => r.id === id) || GAME_REQUESTS[0]; },

    // Новый клиент: внешность, отросшая причёска и заказ под уровень мастера.
    customer(level, seed, forced) {
        const rnd = HairUtil.rng(seed);
        const lang = (typeof Lang !== 'undefined' && Lang.code) || 'ru';
        const names = GAME_NAMES[lang] || GAME_NAMES.en;
        const pool = GAME_REQUESTS.filter(r => r.level <= level);
        // чаще — заказы последнего открытого уровня
        let req = forced ? GameData.request(forced) : null;
        if (!req) {
            const fresh = pool.filter(r => r.level === Math.min(level, 4));
            req = rnd() < 0.55 && fresh.length ? GameData.pick(fresh, rnd) : GameData.pick(pool, rnd);
        }
        const styleIds = Object.keys(GAME_HAIRSTYLES);
        let styleId = GameData.pick(styleIds, rnd);
        if (req.id === 'fringe' && (styleId === 'afro' || styleId === 'spiky' || styleId === 'slick')) styleId = 'mop';
        if (req.id === 'mohawk' && styleId === 'afro') styleId = 'shag';
        const base = GAME_HAIRSTYLES[styleId];
        const fun = rnd() < 0.16;
        const color = fun ? GameData.pick(GAME_FUN_COLORS, rnd) : GameData.pick(GAME_HAIR_COLORS, rnd);
        const beardKind = req.beard ? (rnd() < 0.5 ? 'full' : 'long') : (rnd() < 0.22 ? GameData.pick(['stubble', 'full'], rnd) : 'none');
        const spec = Object.assign({}, base, {
            color, beard: beardKind !== 'none',
            len: Object.assign({}, base.len, { beard: GAME_BEARDS[beardKind] }),
            lay: Object.assign({}, base.lay, { beard: 0.45 }),
        });
        if (!fun && rnd() < 0.12) { spec.color2 = GameData.pick(GAME_FUN_COLORS, rnd); spec.streak = 0.25; }
        return {
            seed, name: GameData.pick(names, rnd), request: req, styleId, spec,
            look: { skin: GameData.pick(CHAR_SKINS, rnd), shirt: GameData.pick(GAME_SHIRTS, rnd), pants: GameData.pick(GAME_PANTS, rnd), sleeve: rnd() < 0.4 ? 'long' : 'short' },
        };
    },

    // Правила заказа для HairField.setTargets + правило по прядям.
    applyRequest(field, req) {
        field.setTargets(req.zones);
        if (req.strand) {
            const n = field.count || field.n, m = field.mat, d = field.dyn;
            for (let i = 0; i < n; i++) {
                const r = req.strand(m[i * 16], m[i * 16 + 1], m[i * 16 + 2], field.zone[i]);
                if (r === undefined) continue;
                if (r === null) { field.tW[i] = 0; d[i * 4 + 1] = 0; continue; }
                if (r.keep != null) { field.tLo[i] = field.len0[i] * r.keep; field.tHi[i] = 1e9; }
                else { field.tLo[i] = r.min || 0; field.tHi[i] = r.max + 0.012; }
                field.tW[i] = r.weight == null ? 1 : r.weight;
                const L = d[i * 4];
                d[i * 4 + 1] = L > field.tHi[i] ? 1 : L < field.tLo[i] - 0.004 ? -1 : 0;
            }
            field.dirty = true;
            field.score0 = null; field.score0 = field.score().frac;
        }
    },

    // Длины зон для портрета: как сейчас (zoneStats) и как должно быть (по заказу).
    portraitNow(cust, field, mood) {
        const s = field.zoneStats();
        return { skin: cust.look.skin, hair: cust.spec.color, mood: mood || 'neutral', len: { top: s.top, front: s.front, side: (s.left + s.right) / 2, back: s.back, beard: s.beard } };
    },
    portraitTarget(cust, field) {
        const now = GameData.portraitNow(cust, field, 'happy'), z = cust.request.zones, len = now.len;
        const t = (rule, cur) => (!rule ? cur : rule.keep != null ? cur : Math.min(cur, rule.max));
        const out = { top: t(z.top, len.top), front: t(z.front, len.front), side: t(z.side, len.side), back: t(z.back, len.back), beard: t(z.beard, len.beard) };
        if (cust.request.id === 'mohawk') { out.side = 0; out.back = 0; }
        if (cust.request.id === 'goatee') out.beard = Math.min(len.beard, 0.16);
        return Object.assign(now, { len: out });
    },
};
