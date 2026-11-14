// Maps.js — карты игры: земля, рельеф и объекты каждой карты. Пишет редактор
// (вкладки Maps и Objects) — файл целиком, формат держать.
// Карта: id — латиница, цифры, _ и - (по нему игра грузит карту: app.loadMap(id));
//   name — название для редактора; width, height — px мира; ground — текстура земли
//   (0 — трава, 1 — песок, 2 — снег); terrain — рельеф: amp — высота холмов px (0 —
//   плоско), scale — размер холма px, seed — сид шума, base — уровень земли px.
// Объект карты: kind — 'prop' (окружение) | 'actor' (главный объект кадра) | 'marker'
//   (точка для логики игры без модели: спавн, враг, финиш — location.markers(имя));
//   model — путь модели от assets/ (.fbx, .obj, .glb, .gltf) строковым литералом: сборщик
//   берёт в архив только ассеты с такими ссылками; x, y — px карты; h — px над землёй;
//   rot — [x, y, z] градусы: y — курс (0 — вдоль +x, 90 — вниз по карте), x и z — наклон;
//   scale — [x, y, z] к размеру модели (1 см = 1 px); anim — вращение части модели
//   (необязательно): part — объект внутри модели, axis — его ось 'x' | 'y' | 'z' (с
//   минусом — обратный конец), speed — об/мин, dir — 'cw' | 'ccw' с конца оси.
const GAME_MAPS = [
    {
        id: 'salon', name: 'Salon', width: 1800, height: 1500, ground: 0,
        terrain: { amp: 0, scale: 800, seed: 4, base: 0 },
        objects: [
            // Комната салона: центр и размер (scale: ширина, высота стен, глубина — в метрах)
            { name: 'room', kind: 'marker', x: 900, y: 750, h: 0, rot: [0, 0, 0], scale: [10, 3, 7] },
            { name: 'spawn', kind: 'marker', x: 880, y: 860, h: 0, rot: [0, -90, 0], scale: [1, 1, 1] },
            // Рабочее кресло мастера (клиент сидит лицом к зеркалу на левой стене)
            { name: 'chair', kind: 'marker', x: 700, y: 640, h: 0, rot: [0, 180, 0], scale: [1, 1, 1] },
            // Места ожидания у правой стены
            { name: 'wait', kind: 'marker', x: 1335, y: 600, h: 0, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'wait-2', kind: 'marker', x: 1335, y: 740, h: 0, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'wait-3', kind: 'marker', x: 1335, y: 880, h: 0, rot: [0, 180, 0], scale: [1, 1, 1] },
            // Путь клиента: улица -> дверь -> салон -> дверь -> улица
            { name: 'street', kind: 'marker', x: 1740, y: 310, h: 0, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'street-2', kind: 'marker', x: 60, y: 310, h: 0, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'door-out', kind: 'marker', x: 1180, y: 320, h: 0, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'door-in', kind: 'marker', x: 1180, y: 490, h: 0, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'hall', kind: 'marker', x: 1130, y: 700, h: 0, rot: [0, 0, 0], scale: [1, 1, 1] },
            // Коробка с поставкой (новые инструменты)
            { name: 'box', kind: 'marker', x: 1010, y: 560, h: 0, rot: [0, 20, 0], scale: [1, 1, 1] },
            // Проёмы задней стены: дверь и витрина (scale[0] — ширина проёма в метрах)
            { name: 'doorway', kind: 'marker', x: 1180, y: 400, h: 0, rot: [0, 90, 0], scale: [1.06, 2.16, 1] },
            { name: 'windowway', kind: 'marker', x: 700, y: 400, h: 75, rot: [0, 90, 0], scale: [2.2, 1.5, 1] },
            // Мебель и окружение (модели — assets/models/salon)
            { name: 'barber-chair', model: 'assets/models/salon/barber_chair.glb', kind: 'prop', x: 700, y: 640, h: 2, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'rug', model: 'assets/models/salon/rug.glb', kind: 'prop', x: 700, y: 640, h: 2.4, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'station', model: 'assets/models/salon/station.glb', kind: 'prop', x: 425, y: 640, h: 2, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'shelf', model: 'assets/models/salon/shelf.glb', kind: 'prop', x: 417, y: 905, h: 2, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'trash-bin', model: 'assets/models/salon/trash_bin.glb', kind: 'prop', x: 452, y: 770, h: 2, rot: [0, 20, 0], scale: [1, 1, 1] },
            { name: 'poster-a', model: 'assets/models/salon/poster_a.glb', kind: 'prop', x: 402, y: 470, h: 170, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'wall-clock', model: 'assets/models/salon/wall_clock.glb', kind: 'prop', x: 403, y: 1040, h: 205, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'wait-chair', model: 'assets/models/salon/waiting_chair.glb', kind: 'prop', x: 1335, y: 600, h: 2, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'wait-chair-2', model: 'assets/models/salon/waiting_chair.glb', kind: 'prop', x: 1335, y: 740, h: 2, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'wait-chair-3', model: 'assets/models/salon/waiting_chair.glb', kind: 'prop', x: 1335, y: 880, h: 2, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'poster-b', model: 'assets/models/salon/poster_b.glb', kind: 'prop', x: 1398, y: 740, h: 180, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'sofa', model: 'assets/models/salon/sofa.glb', kind: 'prop', x: 1010, y: 1052, h: 2, rot: [0, -90, 0], scale: [1, 1, 1] },
            { name: 'plant', model: 'assets/models/salon/plant.glb', kind: 'prop', x: 1340, y: 1030, h: 2, rot: [0, 35, 0], scale: [1, 1, 1] },
            { name: 'plant-2', model: 'assets/models/salon/plant.glb', kind: 'prop', x: 462, y: 462, h: 2, rot: [0, 120, 0], scale: [1, 1, 1] },
            { name: 'reception', model: 'assets/models/salon/reception.glb', kind: 'prop', x: 930, y: 446, h: 2, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'sign', model: 'assets/models/salon/sign.glb', kind: 'prop', x: 930, y: 403, h: 228, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'door', model: 'assets/models/salon/door.glb', kind: 'prop', x: 1180, y: 400, h: 2, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'window', model: 'assets/models/salon/window.glb', kind: 'prop', x: 700, y: 400, h: 0, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'lamp', model: 'assets/models/salon/ceiling_lamp.glb', kind: 'prop', x: 700, y: 640, h: 300, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'lamp-2', model: 'assets/models/salon/ceiling_lamp.glb', kind: 'prop', x: 930, y: 760, h: 300, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'lamp-3', model: 'assets/models/salon/ceiling_lamp.glb', kind: 'prop', x: 1230, y: 760, h: 300, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'barber-pole', model: 'assets/models/salon/barber_pole.glb', kind: 'prop', x: 1290, y: 352, h: 3, rot: [0, 0, 0], scale: [1, 1, 1], anim: { part: 'Stripes', axis: 'y', speed: 18, dir: 'ccw' } },
            { name: 'awning', model: 'assets/models/salon/awning.glb', kind: 'prop', x: 700, y: 386, h: 238, rot: [0, -90, 0], scale: [1, 1, 1] },
            { name: 'awning-2', model: 'assets/models/salon/awning.glb', kind: 'prop', x: 1180, y: 386, h: 242, rot: [0, -90, 0], scale: [1, 1, 1] },
            { name: 'street-lamp', model: 'assets/models/salon/street_lamp.glb', kind: 'prop', x: 470, y: 262, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'street-lamp-2', model: 'assets/models/salon/street_lamp.glb', kind: 'prop', x: 1420, y: 262, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'bench', model: 'assets/models/salon/bench.glb', kind: 'prop', x: 900, y: 352, h: 3, rot: [0, -90, 0], scale: [1, 1, 1] },
            { name: 'tree', model: 'assets/models/salon/tree.glb', kind: 'prop', x: 260, y: 330, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'tree-2', model: 'assets/models/salon/tree.glb', kind: 'prop', x: 1580, y: 330, h: 3, rot: [0, 70, 0], scale: [1, 1, 1] },
            { name: 'tree-3', model: 'assets/models/salon/tree.glb', kind: 'prop', x: 560, y: -235, h: 3, rot: [0, 30, 0], scale: [1.25, 1.25, 1.25] },
            { name: 'tree-4', model: 'assets/models/salon/tree.glb', kind: 'prop', x: 1240, y: -235, h: 3, rot: [0, 140, 0], scale: [1.25, 1.25, 1.25] },
            { name: 'tree-5', model: 'assets/models/salon/tree.glb', kind: 'prop', x: 1900, y: -235, h: 3, rot: [0, 250, 0], scale: [1.25, 1.25, 1.25] },
            // Улица: дома через дорогу, соседи, дальний город, машины и мелочи (модели — assets/models/street)
            { name: 'house', model: 'assets/models/street/house_a.glb', kind: 'prop', x: -420, y: -560, h: 0, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'house-2', model: 'assets/models/street/house_b.glb', kind: 'prop', x: 250, y: -560, h: 0, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'house-3', model: 'assets/models/street/house_c.glb', kind: 'prop', x: 900, y: -560, h: 0, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'house-4', model: 'assets/models/street/house_d.glb', kind: 'prop', x: 1560, y: -560, h: 0, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'house-5', model: 'assets/models/street/house_e.glb', kind: 'prop', x: 2230, y: -560, h: 0, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'neighbor', model: 'assets/models/street/house_side_a.glb', kind: 'prop', x: -70, y: 560, h: 0, rot: [0, -90, 0], scale: [1, 1, 1] },
            { name: 'neighbor-2', model: 'assets/models/street/house_side_b.glb', kind: 'prop', x: 1870, y: 560, h: 0, rot: [0, -90, 0], scale: [1, 1, 1] },
            { name: 'city', model: 'assets/models/street/backdrop_city.glb', kind: 'prop', x: 900, y: -2100, h: 0, rot: [0, 90, 0], scale: [1.6, 1.6, 1.6] },
            { name: 'city-2', model: 'assets/models/street/backdrop_city.glb', kind: 'prop', x: -2300, y: -300, h: 0, rot: [0, 0, 0], scale: [1.6, 1.6, 1.6] },
            { name: 'city-3', model: 'assets/models/street/backdrop_city.glb', kind: 'prop', x: 4100, y: -300, h: 0, rot: [0, 180, 0], scale: [1.6, 1.6, 1.6] },
            { name: 'car', model: 'assets/models/street/car_a.glb', kind: 'prop', x: 200, y: 120, h: 1, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'car-2', model: 'assets/models/street/car_b.glb', kind: 'prop', x: 1500, y: -70, h: 1, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'crosswalk', model: 'assets/models/street/crosswalk.glb', kind: 'prop', x: 1180, y: 26, h: 1.4, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'hydrant', model: 'assets/models/street/hydrant.glb', kind: 'prop', x: 1345, y: 236, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'mailbox', model: 'assets/models/street/mailbox.glb', kind: 'prop', x: 1065, y: 372, h: 3, rot: [0, 90, 0], scale: [1, 1, 1] },
            { name: 'bike', model: 'assets/models/street/bike.glb', kind: 'prop', x: 545, y: 372, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'planter', model: 'assets/models/street/planter.glb', kind: 'prop', x: 700, y: 366, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'bush', model: 'assets/models/street/bush.glb', kind: 'prop', x: 1105, y: 368, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'bush-2', model: 'assets/models/street/bush.glb', kind: 'prop', x: 1255, y: 368, h: 3, rot: [0, 40, 0], scale: [1, 1, 1] },
            { name: 'bush-3', model: 'assets/models/street/bush.glb', kind: 'prop', x: 330, y: 1130, h: 0, rot: [0, 10, 0], scale: [1.2, 1.2, 1.2] },
            { name: 'bush-4', model: 'assets/models/street/bush.glb', kind: 'prop', x: 1470, y: 1130, h: 0, rot: [0, 70, 0], scale: [1.2, 1.2, 1.2] },
            { name: 'planter-2', model: 'assets/models/street/planter.glb', kind: 'prop', x: 150, y: -250, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'planter-3', model: 'assets/models/street/planter.glb', kind: 'prop', x: 1250, y: -250, h: 3, rot: [0, 0, 0], scale: [1, 1, 1] },
        ],
    },
];
