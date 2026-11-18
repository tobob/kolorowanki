/**
 * THE CONTENT — every colouring page as a scene spec. Edit here, then `npm run build-pages`.
 *
 * Page canvas: 300 × 400 (portrait). Items: { slug, x, y, w, h?, anchor?, flip?, rot? } — (x, y) is the item's
 * centre (or bottom centre with anchor: 'bottom'), the drawing is scaled to fit w × h. Background parts come
 * from ./bg (sky, bands, hills, ponds…) and are drawn first, `fg` parts last. Pages are sorted by difficulty
 * (number of regions) inside each level at build time; ids are `l{level}-{slug}` and must never change.
 */
import { LANGS, type Level, type Localized } from '../../src/coloring/types';
import { backdrop, band, BG, ellipse, hill, line, ripples, roundRect, stalk, star, stripe } from './bg';
import type { ItemSpec, PageSpec } from './compose';

/** Title in LANGS order: pl en de fr es it pt nl uk cs sk sv ro hu tr ja zh */
function t(...s: string[]): Localized {
  if (s.length !== LANGS.length) throw new Error(`title needs ${LANGS.length} languages: ${s[0]}`);
  return Object.fromEntries(LANGS.map((l, i) => [l, s[i]])) as Localized;
}

const at = (slug: string, x: number, y: number, w: number, extra: Partial<ItemSpec> = {}): ItemSpec => ({ slug, x, y, w, ...extra });
/** item standing on a line y (bottom anchored) */
const on = (slug: string, x: number, bottom: number, w: number, h?: number, extra: Partial<ItemSpec> = {}): ItemSpec => ({
  slug,
  x,
  y: bottom,
  w,
  h,
  anchor: 'bottom',
  ...extra,
});

// ───────────────────────────── Level 1 — one big picture ─────────────────────────────
const L1_ITEMS = ['ball', 'heart-toy', 'balloon', 'sun', 'star', 'cloud', 'apple', 'pear', 'fish', 'snail', 'house', 'kitten'];
const level1: PageSpec[] = L1_ITEMS.map((slug) => ({ slug, items: [at(slug, 150, 200, 250, { h: 310 })] }));

// ───────────────────────────── Level 2 — two or three pictures ─────────────────────────────
const ground = (y: number, c = BG.grassLight) => band(y, c, 5, 1.2, 0.5);

const level2: PageSpec[] = [
  {
    slug: 'fruit',
    title: t('Owoce', 'Fruit', 'Obst', 'Des fruits', 'Frutas', 'Frutta', 'Frutas', 'Fruit', 'Фрукти', 'Ovoce', 'Ovocie', 'Frukt', 'Fructe', 'Gyümölcsök', 'Meyveler', 'くだもの', '水果'),
    items: [at('apple', 90, 140, 140), at('pear', 215, 150, 130, { h: 160 }), at('cherry', 150, 300, 150, { h: 150 })],
  },
  {
    slug: 'sun-cloud',
    title: t('Słoneczko i chmurka', 'Sun and cloud', 'Sonne und Wolke', 'Le soleil et le nuage', 'El sol y la nube', 'Il sole e la nuvola', 'O sol e a nuvem', 'Zon en wolk', 'Сонечко і хмаринка', 'Sluníčko a mráček', 'Slniečko a obláčik', 'Solen och molnet', 'Soarele și norișorul', 'Napocska és felhőcske', 'Güneş ve bulut', 'おひさまとくも', '太阳和云朵'),
    items: [at('sun', 105, 120, 150), at('cloud', 195, 200, 170, { h: 120 }), at('rainbow', 150, 320, 230, { h: 140 })],
  },
  {
    slug: 'veggies',
    title: t('Warzywa', 'Vegetables', 'Gemüse', 'Les légumes', 'Verduras', 'Verdure', 'Legumes', 'Groenten', 'Овочі', 'Zelenina', 'Zelenina', 'Grönsaker', 'Legume', 'Zöldségek', 'Sebzeler', 'やさい', '蔬菜'),
    items: [at('carrot', 85, 150, 130, { h: 190 }), at('tomato', 215, 140, 130), at('peas', 150, 310, 200, { h: 120 })],
  },
  {
    slug: 'birthday',
    title: t('Urodziny', 'Birthday', 'Geburtstag', 'Anniversaire', 'Cumpleaños', 'Compleanno', 'Aniversário', 'Verjaardag', 'День народження', 'Narozeniny', 'Narodeniny', 'Födelsedag', 'Ziua de naștere', 'Születésnap', 'Doğum günü', 'おたんじょうび', '生日'),
    items: [at('balloon', 75, 120, 110, { h: 190 }), at('gift', 225, 130, 120), at('cake', 150, 300, 190, { h: 160 })],
  },
  {
    slug: 'ducks',
    title: t('Kaczka i kaczątko', 'Duck and duckling', 'Ente und Entchen', 'La cane et son caneton', 'La pata y el patito', 'Mamma anatra e anatroccolo', 'A pata e o patinho', 'Eend en eendje', 'Качечка і каченя', 'Kachna a káčátko', 'Kačka a káčatko', 'Anka och ankunge', 'Rața și rățușca', 'Kacsa és kiskacsa', 'Ördek ve yavrusu', 'あひるのおやこ', '鸭妈妈和小鸭'),
    bg: [ellipse(150, 330, 175, 70, BG.water)],
    items: [on('duck', 115, 330, 180, 190), on('duckling', 235, 335, 90, 100)],
  },
  {
    slug: 'toys',
    title: t('Zabawki', 'Toys', 'Spielsachen', 'Les jouets', 'Juguetes', 'Giocattoli', 'Brinquedos', 'Speelgoed', 'Іграшки', 'Hračky', 'Hračky', 'Leksaker', 'Jucării', 'Játékok', 'Oyuncaklar', 'おもちゃ', '玩具'),
    bg: [ground(320)],
    items: [on('teddy', 110, 345, 170, 230), on('block', 235, 260, 85), on('ball', 235, 360, 80)],
  },
  {
    slug: 'bee-flower',
    title: t('Pszczółka i kwiatek', 'Bee and flower', 'Biene und Blume', "L'abeille et la fleur", 'La abeja y la flor', "L'ape e il fiore", 'A abelha e a flor', 'Bij en bloem', 'Бджілка і квітка', 'Včelka a kytička', 'Včielka a kvietok', 'Biet och blomman', 'Albinuța și floarea', 'Méhecske és virág', 'Arı ve çiçek', 'みつばちとおはな', '小蜜蜂和花'),
    bg: [ground(330)],
    items: [on('flower', 110, 360, 180, 270), at('bee', 220, 105, 120)],
  },
  {
    slug: 'kitten-ball',
    title: t('Kotek i piłka', 'Kitten and ball', 'Kätzchen und Ball', 'Le chaton et la balle', 'El gatito y la pelota', 'Il gattino e la palla', 'O gatinho e a bola', 'Poesje en bal', "Кошеня і м'ячик", 'Kotě a míč', 'Mačiatko a lopta', 'Kattungen och bollen', 'Pisicuța și mingea', 'Cica és a labda', 'Yavru kedi ve top', 'こねことボール', '小猫和球'),
    bg: [ground(300)],
    items: [on('kitten', 125, 330, 210, 230), on('ball', 240, 365, 85)],
  },
  {
    slug: 'bunny-carrot',
    title: t('Króliczek i marchewka', 'Bunny and carrot', 'Häschen und Karotte', 'Le lapin et la carotte', 'El conejito y la zanahoria', 'Il coniglietto e la carota', 'O coelhinho e a cenoura', 'Konijntje en wortel', 'Кролик і морквинка', 'Králíček a mrkev', 'Králiček a mrkva', 'Kaninen och moroten', 'Iepurașul și morcovul', 'Nyuszi és a répa', 'Tavşan ve havuç', 'うさぎとにんじん', '小兔子和胡萝卜'),
    bg: [ground(320)],
    items: [on('rabbit', 115, 350, 170, 270), on('carrot', 230, 370, 100, 150, { rot: 15 })],
  },
  {
    slug: 'car-bus',
    title: t('Samochód i autobus', 'Car and bus', 'Auto und Bus', 'La voiture et le bus', 'El coche y el autobús', "L'auto e l'autobus", 'O carro e o ônibus', 'Auto en bus', 'Машинка й автобус', 'Auto a autobus', 'Auto a autobus', 'Bilen och bussen', 'Mașina și autobuzul', 'Autó és busz', 'Araba ve otobüs', 'くるまとバス', '小汽车和公共汽车'),
    bg: [stripe(170, 200, BG.road, 0, 1), stripe(335, 365, BG.road, 0, 1)],
    items: [on('car', 150, 192, 220, 140), on('autobus', 150, 357, 240, 150)],
  },
  {
    slug: 'puppy-house',
    title: t('Piesek i buda', 'Puppy and doghouse', 'Hündchen und Hundehütte', 'Le chiot et sa niche', 'El perrito y su caseta', 'Il cagnolino e la cuccia', 'O cachorrinho e a casinha', 'Puppy en hondenhok', 'Цуценя і будка', 'Pejsek a bouda', 'Psík a búda', 'Valpen och hundkojan', 'Cățelușul și cușca', 'Kiskutya és a kutyaház', 'Köpekçik ve kulübesi', 'こいぬとこいぬごや', '小狗和狗窝'),
    bg: [ground(270)],
    items: [on('doghouse', 195, 285, 190, 190), on('puppy', 95, 375, 150, 180)],
  },
  {
    slug: 'winter',
    title: t('Zima', 'Winter', 'Winter', "L'hiver", 'Invierno', 'Inverno', 'Inverno', 'Winter', 'Зима', 'Zima', 'Zima', 'Vinter', 'Iarna', 'Tél', 'Kış', 'ふゆ', '冬天'),
    bg: [ground(330, BG.skyPale)],
    items: [on('snowman', 120, 365, 190, 300), at('mitten', 240, 120, 90), at('hat', 245, 270, 95)],
  },
];

// ───────────────────────────── Level 3 — a small scene ─────────────────────────────
const sky = () => backdrop(BG.sky);

const level3: PageSpec[] = [
  {
    slug: 'farm',
    title: t('Na wsi', 'On the farm', 'Auf dem Bauernhof', 'À la ferme', 'En la granja', 'In fattoria', 'Na fazenda', 'Op de boerderij', 'На фермі', 'Na statku', 'Na farme', 'På bondgården', 'La fermă', 'A tanyán', 'Çiftlikte', 'ぼくじょうで', '在农场'),
    bg: [sky(), hill(60, 215, 210, BG.grassLight), hill(270, 235, 170, BG.grassLight), band(290, BG.grass, 5, 1)],
    items: [at('sun', 245, 60, 80), on('barn', 95, 300, 140, 160), on('cow', 210, 375, 130, 140), on('hen', 65, 385, 85, 95)],
  },
  {
    slug: 'garden',
    title: t('W ogródku', 'In the garden', 'Im Garten', 'Au jardin', 'En el jardín', 'In giardino', 'No jardim', 'In de tuin', 'У садочку', 'Na zahrádce', 'V záhradke', 'I trädgården', 'În grădină', 'A kertben', 'Bahçede', 'おにわで', '在花园里'),
    bg: [sky(), band(270, BG.grass, 6, 1.3)],
    items: [at('sun', 60, 60, 80), at('butterfly', 210, 105, 110), on('flower', 80, 360, 120, 210), on('tulipan', 215, 365, 120, 180), on('snail', 150, 392, 85, 70)],
  },
  {
    slug: 'beach',
    title: t('Na plaży', 'At the beach', 'Am Strand', 'À la plage', 'En la playa', 'Al mare', 'Na praia', 'Op het strand', 'На пляжі', 'Na pláži', 'Na pláži', 'På stranden', 'La plajă', 'A strandon', 'Plajda', 'うみべで', '在海滩上'),
    bg: [sky(), band(170, BG.sea, 5, 2.5), band(255, BG.sand, 7, 1.2, 1)],
    items: [at('sun', 245, 60, 80), on('boat', 85, 200, 100, 110), on('pilka-plazowa', 80, 345, 95), on('bucket', 200, 360, 85, 90), on('rozgwiazda', 135, 392, 60), on('shovel', 260, 375, 50, 100, { rot: 15 })],
  },
  {
    slug: 'pond',
    title: t('Nad stawem', 'By the pond', 'Am Teich', "Au bord de l'étang", 'Junto al estanque', 'Allo stagno', 'Na lagoa', 'Bij de vijver', 'Біля ставка', 'U rybníka', 'Pri rybníku', 'Vid dammen', 'La iaz', 'A tónál', 'Gölette', 'いけのほとりで', '在池塘边'),
    bg: [
      sky(),
      band(215, BG.grass, 5, 1),
      ellipse(165, 315, 150, 62, BG.water),
      stalk(268, 262, 100, 9, BG.grassLight, 6),
      stalk(285, 268, 75, 9, BG.grassLight, -5),
      ripples(110, 350, 40),
      ripples(220, 290, 34),
    ],
    items: [at('cloud', 90, 80, 120), at('sun', 240, 65, 80), on('frog', 85, 265, 105, 90), on('duck', 200, 335, 120, 120)],
  },
  {
    slug: 'winter-day',
    title: t('Zimowy dzień', 'A winter day', 'Ein Wintertag', "Une journée d'hiver", 'Un día de invierno', "Una giornata d'inverno", 'Um dia de inverno', 'Een winterdag', 'Зимовий день', 'Zimní den', 'Zimný deň', 'En vinterdag', 'O zi de iarnă', 'Téli nap', 'Bir kış günü', 'ふゆのひ', '冬天的一天'),
    bg: [sky(), hill(60, 230, 200, BG.snow), hill(260, 215, 160, BG.snow), band(305, BG.snow, 5, 1, 2)],
    items: [at('cloud', 90, 70, 120), at('sun', 240, 60, 75), on('choinka', 225, 330, 120, 190), on('snowman', 95, 385, 130, 200)],
  },
  {
    slug: 'playground',
    title: t('Na placu zabaw', 'At the playground', 'Auf dem Spielplatz', 'Au parc de jeux', 'En el parque infantil', 'Al parco giochi', 'No parquinho', 'Op de speelplaats', 'На майданчику', 'Na hřišti', 'Na ihrisku', 'På lekplatsen', 'La locul de joacă', 'A játszótéren', 'Oyun parkında', 'こうえんで', '在游乐场'),
    bg: [sky(), band(255, BG.grass, 5, 1.2)],
    items: [at('sun', 245, 55, 75), at('cloud', 90, 65, 110), on('hustawka', 215, 320, 140, 150), on('zjezdzalnia', 90, 345, 150, 160), on('ball', 205, 385, 60)],
  },
  {
    slug: 'under-the-sea',
    title: t('Pod wodą', 'Under the sea', 'Unter Wasser', 'Sous la mer', 'Bajo el mar', "Sott'acqua", 'No fundo do mar', 'Onder water', 'Під водою', 'Pod vodou', 'Pod vodou', 'Under havet', 'Sub apă', 'A víz alatt', 'Su altında', 'うみのなかで', '在海底'),
    bg: [
      backdrop(BG.water),
      band(345, BG.sand, 6, 1.4),
      stalk(25, 370, 170, 12, BG.grass, 9),
      stalk(275, 365, 140, 12, BG.grass, -8),
      ellipse(150, 40, 9, 9, BG.skyPale, 3),
      ellipse(170, 70, 6, 6, BG.skyPale, 3),
    ],
    items: [at('fish', 110, 120, 130), at('meduza', 235, 110, 80, { h: 110 }), on('octopus', 205, 380, 120, 140), on('rozgwiazda', 75, 390, 70)],
  },
  {
    slug: 'forest',
    title: t('W lesie', 'In the forest', 'Im Wald', 'Dans la forêt', 'En el bosque', 'Nel bosco', 'Na floresta', 'In het bos', 'У лісі', 'V lese', 'V lese', 'I skogen', 'În pădure', 'Az erdőben', 'Ormanda', 'もりで', '在森林里'),
    bg: [sky(), hill(150, 200, 260, BG.grassLight), band(290, BG.grass, 5, 1.1)],
    items: [on('tree', 75, 305, 130, 200), on('tree', 230, 295, 110, 160), on('hedgehog', 105, 385, 115, 90), on('mushroom', 230, 385, 70, 80), on('acorn', 175, 330, 40)],
  },
  {
    slug: 'picnic',
    title: t('Piknik', 'Picnic', 'Picknick', 'Le pique-nique', 'El pícnic', 'Il picnic', 'O piquenique', 'Picknick', 'Пікнік', 'Piknik', 'Piknik', 'Picknick', 'Picnic', 'Piknik', 'Piknik', 'ピクニック', '野餐'),
    bg: [sky(), hill(250, 190, 200, BG.grassLight), band(235, BG.grass, 5, 1), roundRect(150, 320, 250, 120, 16, BG.red, -4)],
    items: [at('sun', 60, 60, 80), on('tree', 240, 245, 100, 150), at('sandwich', 85, 300, 80), at('watermelon', 160, 345, 80), at('cup', 220, 305, 60), at('apple', 240, 360, 50)],
  },
  {
    slug: 'rainy-day',
    title: t('Deszczowy dzień', 'A rainy day', 'Ein Regentag', 'Un jour de pluie', 'Un día de lluvia', 'Una giornata di pioggia', 'Um dia de chuva', 'Een regenachtige dag', 'Дощовий день', 'Deštivý den', 'Daždivý deň', 'En regnig dag', 'O zi ploioasă', 'Esős nap', 'Yağmurlu bir gün', 'あめのひ', '下雨天'),
    bg: [backdrop(BG.skyPale), band(300, BG.grass, 5, 1), ellipse(150, 360, 110, 24, BG.water)],
    items: [
      at('cloud', 95, 70, 150),
      at('cloud', 230, 110, 100),
      at('raindrop', 45, 175, 26),
      at('raindrop', 255, 200, 26),
      at('raindrop', 110, 150, 22),
      at('umbrella', 150, 225, 150, { h: 150 }),
      on('boot', 115, 362, 60, 75),
      on('boot', 180, 362, 60, 75, { flip: true }),
    ],
  },
  {
    slug: 'town',
    title: t('W miasteczku', 'In the town', 'In der kleinen Stadt', 'En ville', 'En el pueblo', 'In paese', 'Na cidadezinha', 'In het stadje', 'У містечку', 'V městečku', 'V mestečku', 'I staden', 'În orășel', 'A kisvárosban', 'Kasabada', 'まちで', '在小镇上'),
    bg: [sky(), band(245, BG.grass, 4, 1), stripe(305, 372, BG.road, 0, 1), line('M30 338H60M120 338H150M210 338H240', 4)],
    items: [at('sun', 245, 55, 75), on('house', 85, 265, 135, 160), on('tree', 225, 258, 95, 150), on('car', 150, 362, 160, 90)],
  },
  {
    slug: 'space',
    title: t('W kosmosie', 'In space', 'Im Weltall', "Dans l'espace", 'En el espacio', 'Nello spazio', 'No espaço', 'In de ruimte', 'У космосі', 'Ve vesmíru', 'Vo vesmíre', 'I rymden', 'În spațiu', 'Az űrben', 'Uzayda', 'うちゅうで', '在太空中'),
    bg: [
      backdrop(BG.dusk),
      star(40, 190, 14, BG.sun, 10),
      star(270, 40, 12, BG.sun),
      star(160, 40, 10, BG.sun, -12),
      band(320, BG.road, 6, 1, 0.5),
      ellipse(70, 365, 26, 9, '#D9D9DE', 3),
      ellipse(235, 375, 20, 7, '#D9D9DE', 3),
    ],
    items: [at('planeta-z-pierscieniem', 90, 100, 140), at('ufo', 215, 190, 130), on('maly-kosmita', 95, 340, 95, 120), on('ksiezycowy-lazik', 215, 350, 120, 100)],
  },
];

// ───────────────────────────── Level 4 — a busy collage ─────────────────────────────
type Slot = [x: number, y: number, w: number, rot: number];
/** Hand-tuned scatter layouts (items overlap a little; later ones are drawn on top). */
const LAYOUT: Record<number, Slot[]> = {
  6: [
    [80, 80, 130, -8],
    [220, 95, 130, 8],
    [150, 200, 140, 0],
    [70, 300, 125, 6],
    [230, 300, 125, -6],
    [150, 365, 90, 0],
  ],
  7: [
    [75, 70, 115, -8],
    [215, 70, 115, 8],
    [145, 165, 120, 0],
    [55, 245, 100, 8],
    [245, 240, 105, -8],
    [95, 340, 115, -4],
    [215, 340, 115, 5],
  ],
  8: [
    [70, 70, 110, -8],
    [205, 65, 115, 6],
    [140, 160, 115, 0],
    [55, 245, 100, 8],
    [245, 220, 105, -6],
    [150, 285, 105, 4],
    [65, 355, 100, -6],
    [235, 345, 105, 6],
  ],
  9: [
    [60, 65, 100, -8],
    [155, 75, 100, 5],
    [248, 65, 95, -4],
    [65, 190, 100, 6],
    [155, 200, 105, -5],
    [245, 190, 100, 8],
    [62, 320, 100, -6],
    [155, 330, 105, 4],
    [245, 320, 100, -8],
  ],
  10: [
    [60, 60, 95, -8],
    [155, 65, 95, 5],
    [248, 60, 90, -4],
    [100, 160, 100, 6],
    [210, 160, 100, -5],
    [55, 255, 95, 8],
    [155, 255, 100, -4],
    [250, 255, 90, 6],
    [95, 350, 100, -6],
    [210, 350, 100, 5],
  ],
};

function collage(slugs: string[]): ItemSpec[] {
  const slots = LAYOUT[slugs.length];
  if (!slots) throw new Error(`no collage layout for ${slugs.length} items`);
  return slugs.map((slug, i) => {
    const [x, y, w, rot] = slots[i];
    return { slug, x, y, w, rot };
  });
}

/** Patterned backgrounds: big soft shapes in pastel colours. */
const PATTERN = {
  /** a coloured border around a big rounded panel the items sit on */
  frame: (c: string[]) => [backdrop(c[0]), roundRect(150, 200, 264, 364, 34, c[1])],
  waves: (c: string[]) => [backdrop(c[0]), stripe(110, 170, c[1], 12, 1.2), stripe(250, 310, c[2] ?? c[1], 12, 1.2, 1.5)],
  hills: (c: string[]) => [backdrop(c[0]), hill(70, 250, 170, c[1]), hill(250, 270, 150, c[2] ?? c[1])],
};

const level4: PageSpec[] = [
  {
    slug: 'fruit-salad',
    title: t('Sałatka owocowa', 'Fruit salad', 'Obstsalat', 'Salade de fruits', 'Macedonia de frutas', 'Macedonia', 'Salada de frutas', 'Fruitsalade', 'Фруктовий салат', 'Ovocný salát', 'Ovocný šalát', 'Fruktsallad', 'Salată de fructe', 'Gyümölcssaláta', 'Meyve salatası', 'フルーツがいっぱい', '水果沙拉'),
    bg: PATTERN.frame([BG.skyPale, BG.grassLight]),
    items: collage(['banana', 'apple', 'pear', 'lemon', 'strawberry', 'orange', 'cherry', 'grapes', 'plum']),
  },
  {
    slug: 'toy-box',
    title: t('Pudełko z zabawkami', 'Toy box', 'Spielzeugkiste', 'Le coffre à jouets', 'El baúl de juguetes', 'La cesta dei giochi', 'Caixa de brinquedos', 'Speelgoedkist', 'Скриня з іграшками', 'Krabice s hračkami', 'Krabica s hračkami', 'Leksakslådan', 'Cutia cu jucării', 'Játékosláda', 'Oyuncak kutusu', 'おもちゃばこ', '玩具箱'),
    bg: PATTERN.frame([BG.rose, BG.skyPale]),
    items: collage(['kite', 'teddy', 'balloon', 'block', 'drum', 'gumowa-kaczuszka', 'pilka-nozna', 'ball', 'gift']),
  },
  {
    slug: 'farm-friends',
    title: t('Zwierzęta z farmy', 'Farm friends', 'Tiere vom Bauernhof', 'Les animaux de la ferme', 'Animales de la granja', 'Animali della fattoria', 'Animais da fazenda', 'Boerderijdieren', 'Тварини з ферми', 'Zvířátka ze statku', 'Zvieratká z farmy', 'Djuren på gården', 'Animalele de la fermă', 'Háziállatok', 'Çiftlik hayvanları', 'ぼくじょうのなかまたち', '农场动物'),
    bg: PATTERN.hills([BG.sky, BG.grassLight, BG.grass]),
    items: collage(['cow', 'pig', 'hen', 'sheep', 'horse', 'duck', 'puppy', 'kitten']),
  },
  {
    slug: 'sea-friends',
    title: t('Morscy przyjaciele', 'Sea friends', 'Meeresfreunde', 'Les amis de la mer', 'Amigos del mar', 'Amici del mare', 'Amigos do mar', 'Zeevriendjes', 'Морські друзі', 'Mořští kamarádi', 'Morskí kamaráti', 'Havsvänner', 'Prietenii mării', 'Tengeri barátok', 'Deniz arkadaşları', 'うみのなかまたち', '海洋朋友'),
    bg: PATTERN.waves([BG.water, BG.skyPale, BG.sand]),
    items: collage(['whale', 'meduza', 'fish', 'octopus', 'krab', 'konik-morski', 'delfin', 'zolw-morski', 'rozgwiazda', 'narwal']),
  },
  {
    slug: 'meadow',
    title: t('Na łące', 'In the meadow', 'Auf der Wiese', 'Dans la prairie', 'En el prado', 'Nel prato', 'No prado', 'In de wei', 'На лузі', 'Na louce', 'Na lúke', 'På ängen', 'Pe pajiște', 'A réten', 'Çayırda', 'はらっぱで', '在草地上'),
    bg: PATTERN.hills([BG.skyPale, BG.grassLight, BG.grass]),
    items: collage(['butterfly', 'bee', 'wazka', 'flower', 'ladybug', 'tulipan', 'snail', 'gasienica']),
  },
  {
    slug: 'things-that-go',
    title: t('Pojazdy', 'Things that go', 'Fahrzeuge', 'Les véhicules', 'Vehículos', 'Veicoli', 'Veículos', 'Voertuigen', 'Транспорт', 'Dopravní prostředky', 'Dopravné prostriedky', 'Fordon', 'Vehicule', 'Járművek', 'Taşıtlar', 'のりもの', '交通工具'),
    bg: PATTERN.waves([BG.skyPale, BG.grassLight, BG.road]),
    items: collage(['airplane', 'helikopter', 'boat', 'car', 'autobus', 'bicycle', 'train', 'traktor', 'koparka']),
  },
  {
    slug: 'space-adventure',
    title: t('Kosmiczna przygoda', 'Space adventure', 'Weltraumabenteuer', "Aventure dans l'espace", 'Aventura espacial', 'Avventura nello spazio', 'Aventura no espaço', 'Ruimteavontuur', 'Космічна пригода', 'Vesmírné dobrodružství', 'Vesmírne dobrodružstvo', 'Rymdäventyr', 'Aventură în spațiu', 'Űrkaland', 'Uzay macerası', 'うちゅうのぼうけん', '太空探险'),
    bg: [backdrop(BG.dusk), star(150, 128, 13, BG.sun, 8), star(22, 290, 12, BG.sun, -10), star(285, 140, 11, BG.sun)],
    items: collage(['moon', 'gwiazda-spadajaca', 'planeta-z-pierscieniem', 'ufo', 'satelita', 'kometa', 'astronauta-mis', 'maly-kosmita', 'ksiezycowy-lazik', 'rakieta']),
  },
  {
    slug: 'music',
    title: t('Muzyka', 'Music', 'Musik', 'La musique', 'Música', 'Musica', 'Música', 'Muziek', 'Музика', 'Hudba', 'Hudba', 'Musik', 'Muzică', 'Zene', 'Müzik', 'おんがく', '音乐'),
    bg: PATTERN.frame([BG.sand, BG.dusk, BG.skyPale]),
    items: collage(['gitara', 'trabka', 'marakasy', 'cymbalki', 'drum', 'pozytywka', 'skrzypce', 'trojkat-perkusyjny']),
  },
  {
    slug: 'at-home',
    title: t('W domu', 'At home', 'Zu Hause', 'À la maison', 'En casa', 'A casa', 'Em casa', 'Thuis', 'Удома', 'Doma', 'Doma', 'Hemma', 'Acasă', 'Otthon', 'Evde', 'おうちで', '在家里'),
    bg: PATTERN.frame([BG.sand, BG.skyPale, BG.grassLight]),
    items: collage(['lamp', 'clock', 'book', 'bed', 'cup', 'toothbrush', 'soap', 'pillow']),
  },
  {
    slug: 'zoo',
    title: t('W zoo', 'At the zoo', 'Im Zoo', 'Au zoo', 'En el zoo', 'Allo zoo', 'No zoológico', 'In de dierentuin', 'У зоопарку', 'V zoo', 'V zoo', 'På zoo', 'La grădina zoologică', 'Az állatkertben', 'Hayvanat bahçesinde', 'どうぶつえんで', '在动物园'),
    bg: PATTERN.hills([BG.sky, BG.grassLight, BG.sand]),
    items: collage(['giraffe', 'elephant', 'lion', 'zebra', 'monkey', 'panda', 'tiger', 'hipopotam', 'koala']),
  },
  {
    slug: 'yummy',
    title: t('Pyszności', 'Yummy treats', 'Leckereien', 'Les bonnes choses', '¡Qué rico!', 'Che bontà', 'Gostosuras', 'Lekkernijen', 'Смаколики', 'Dobroty', 'Dobroty', 'Godsaker', 'Bunătăți', 'Finomságok', 'Lezzetler', 'おいしいもの', '好吃的'),
    bg: PATTERN.frame([BG.rose, BG.sand, BG.grassLight]),
    items: collage(['cake', 'lody-w-rozku', 'honey', 'milk', 'bread', 'cheese', 'sandwich', 'watermelon', 'corn']),
  },
  {
    slug: 'winter-fun',
    title: t('Zimowe zabawy', 'Winter fun', 'Winterspaß', "Les joies de l'hiver", 'Diversión de invierno', "Divertimento d'inverno", 'Diversão de inverno', 'Winterpret', 'Зимові розваги', 'Zimní radovánky', 'Zimné radovánky', 'Vinterlek', 'Distracție de iarnă', 'Téli móka', 'Kış eğlencesi', 'ふゆあそび', '冬日乐趣'),
    bg: PATTERN.waves([BG.skyPale, BG.snow, BG.water]),
    items: collage(['snowman', 'mitten', 'snowflake', 'hat', 'pingwinek-na-lodzie', 'scarf', 'lopata-do-sniegu', 'iceberg', 'boot', 'choinka']),
  },
];

export const SCENES: Record<Level, PageSpec[]> = { 1: level1, 2: level2, 3: level3, 4: level4 };
