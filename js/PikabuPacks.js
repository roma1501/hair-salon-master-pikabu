// @ts-nocheck
// PikabuPacks.js — наборы за рубли в сборке Пикабу Игр (js/PikabuShop.js). Цены и названия товаров — в Студии
// (каталог CSV: coins_s 19 ₽, coins_m 49 ₽, coins_l 99 ₽, starter 29 ₽, no_ads 59 ₽), здесь — что игрок получает.
// Валюта — деньги движкового Shop (Shop.addCoins), предметы набора — лучшие «за рекламу» из каталога Shop.
PikabuShop.setup({
    colors: ['#ff6fae', '#28c7c9'],
    ready: () => !!(typeof Shop !== 'undefined' && Shop.state && Shop.items().length && typeof Game !== 'undefined'),
    visible: () => Game.mode === 'salon' && !(typeof GameUI !== 'undefined' && GameUI.win),
    persist: () => Shop._save('pikabu'),
    button: { corner: 'tr', x: 12, y: 100 },
    packs: [
        { id: 'coins_s', type: 'consumable', icon: '💵', name: 'Пачка денег', desc: '1 500 $ на облики, машинки и накидки', grant: () => Shop.addCoins(1500) },
        { id: 'coins_m', type: 'consumable', icon: '💰', name: 'Мешок денег', desc: '5 000 $', grant: () => Shop.addCoins(5000) },
        { id: 'coins_l', type: 'consumable', icon: '🏦', name: 'Сейф с деньгами', desc: '12 000 $ — хватит на самые дорогие предметы', best: true, grant: () => Shop.addCoins(12000) },
        {
            id: 'starter', type: 'non_consumable', icon: '💈', name: 'Золотой парикмахер', best: 'Один раз',
            desc: '2 500 $, облик «Радуга», золотая машинка и золотая накидка',
            grant: () => Shop.addCoins(2500),
            apply: () => PikabuShop.shopGrant(['skin_rainbow', 'clipper_gold', 'cape_gold']),
        },
        { id: 'no_ads', type: 'non_consumable', icon: '🚫', name: 'Без рекламы', desc: 'Убирает рекламу между стрижками навсегда. Награды за рекламу остаются', noAds: true },
    ],
});
