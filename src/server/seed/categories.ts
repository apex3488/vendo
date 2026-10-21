/**
 * Initial category tree and attribute configuration. After seeding, everything here is
 * managed from /admin/categories; the UI never hardcodes categories.
 */
type L = [ru: string, uz: string, en: string];
type Opt = [value: string, ...label: L];
type ListingType = "sale" | "rent" | "service";

export type AttrDef = {
  key: string;
  label: L;
  type: "text" | "number" | "select" | "multiselect" | "boolean" | "date";
  required?: boolean;
  filterable?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  maxLength?: number;
  options?: Opt[];
};

export type CatDef = {
  slug: string;
  name: L;
  icon?: string;
  types?: ListingType[];
  hasCondition?: boolean;
  highValue?: boolean;
  attrs?: AttrDef[];
  children?: CatDef[];
};

const COLORS: Opt[] = [
  ["black", "Чёрный", "Qora", "Black"],
  ["white", "Белый", "Oq", "White"],
  ["gray", "Серый", "Kulrang", "Gray"],
  ["silver", "Серебристый", "Kumushrang", "Silver"],
  ["gold", "Золотой", "Oltinrang", "Gold"],
  ["blue", "Синий", "Koʻk", "Blue"],
  ["red", "Красный", "Qizil", "Red"],
  ["green", "Зелёный", "Yashil", "Green"],
  ["beige", "Бежевый", "Bej", "Beige"],
  ["brown", "Коричневый", "Jigarrang", "Brown"],
  ["pink", "Розовый", "Pushti", "Pink"],
  ["purple", "Фиолетовый", "Binafsha", "Purple"],
  ["other", "Другой", "Boshqa", "Other"],
];

const brand: AttrDef = { key: "brand", label: ["Бренд", "Brend", "Brand"], type: "text", maxLength: 60 };
const color: AttrDef = { key: "color", label: ["Цвет", "Rang", "Color"], type: "select", filterable: true, options: COLORS };
const material: AttrDef = { key: "material", label: ["Материал", "Material", "Material"], type: "text", maxLength: 80 };
const defects: AttrDef = { key: "has_defects", label: ["Есть дефекты", "Nuqsonlari bor", "Has defects"], type: "boolean" };
const gender: AttrDef = {
  key: "gender",
  label: ["Пол", "Jins", "Gender"],
  type: "select",
  filterable: true,
  options: [
    ["men", "Мужской", "Erkaklar", "Men"],
    ["women", "Женский", "Ayollar", "Women"],
    ["unisex", "Унисекс", "Uniseks", "Unisex"],
    ["kids", "Детский", "Bolalar", "Kids"],
  ],
};
const clothingSize: AttrDef = {
  key: "size",
  label: ["Размер", "Oʻlcham", "Size"],
  type: "select",
  filterable: true,
  options: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"].map((s) => [s.toLowerCase(), s, s, s] as Opt),
};
const kidsSize: AttrDef = {
  key: "kids_size",
  label: ["Рост / размер", "Boʻy / oʻlcham", "Height / size"],
  type: "select",
  filterable: true,
  options: ["50-62", "68-80", "86-98", "104-116", "122-134", "140-152", "158-170"].map((s) => [s, s, s, s] as Opt),
};
const shoeSize: AttrDef = {
  key: "shoe_size",
  label: ["Размер обуви", "Poyabzal oʻlchami", "Shoe size"],
  type: "number",
  filterable: true,
  min: 15,
  max: 50,
};
const clothing = [brand, clothingSize, color, material, gender, defects];

const warranty: AttrDef = { key: "warranty", label: ["Есть гарантия", "Kafolat bor", "Under warranty"], type: "boolean", filterable: true };
const completeness: AttrDef = {
  key: "completeness",
  label: ["Комплектность", "Toʻplam", "Package contents"],
  type: "multiselect",
  options: [
    ["box", "Коробка", "Quti", "Box"],
    ["charger", "Зарядное устройство", "Zaryadlovchi", "Charger"],
    ["cable", "Кабель", "Kabel", "Cable"],
    ["docs", "Документы / чек", "Hujjatlar / chek", "Documents / receipt"],
    ["case", "Чехол", "Gʻilof", "Case"],
  ],
};

const fuel: AttrDef = {
  key: "engine_type",
  label: ["Тип двигателя", "Dvigatel turi", "Engine type"],
  type: "select",
  filterable: true,
  options: [
    ["petrol", "Бензин", "Benzin", "Petrol"],
    ["gas_petrol", "Газ/бензин", "Gaz/benzin", "Gas/petrol"],
    ["diesel", "Дизель", "Dizel", "Diesel"],
    ["hybrid", "Гибрид", "Gibrid", "Hybrid"],
    ["electric", "Электро", "Elektr", "Electric"],
  ],
};
const transmission: AttrDef = {
  key: "transmission",
  label: ["Коробка передач", "Uzatmalar qutisi", "Transmission"],
  type: "select",
  filterable: true,
  options: [
    ["manual", "Механика", "Mexanika", "Manual"],
    ["automatic", "Автомат", "Avtomat", "Automatic"],
    ["robot", "Робот", "Robot", "Robotic"],
    ["cvt", "Вариатор", "Variator", "CVT"],
  ],
};
const year: AttrDef = { key: "year", label: ["Год выпуска", "Ishlab chiqarilgan yil", "Year"], type: "number", required: true, filterable: true, min: 1950, max: 2030 };
const mileage: AttrDef = { key: "mileage", label: ["Пробег", "Yurgan masofa", "Mileage"], type: "number", filterable: true, unit: "km", min: 0, max: 2_000_000 };

const deliveryAttr: AttrDef = { key: "delivery", label: ["Есть доставка", "Yetkazib berish bor", "Delivery available"], type: "boolean", filterable: true };

const rentAttrs: AttrDef[] = [
  { key: "availability", label: ["Доступно с", "Mavjud sana", "Available from"], type: "date" },
  { key: "rental_terms", label: ["Условия аренды", "Ijara shartlari", "Rental terms"], type: "text", maxLength: 600 },
];

const serviceAttrs: AttrDef[] = [
  {
    key: "work_format",
    label: ["Формат", "Format", "Format"],
    type: "select",
    filterable: true,
    options: [
      ["onsite", "С выездом", "Joyiga borib", "On site"],
      ["office", "У себя", "Oʻz joyimda", "At my place"],
      ["online", "Онлайн", "Onlayn", "Online"],
    ],
  },
  { key: "service_area", label: ["Район работы", "Ish hududi", "Service area"], type: "text", maxLength: 120 },
  { key: "experience_years", label: ["Опыт, лет", "Tajriba, yil", "Experience, years"], type: "number", min: 0, max: 70 },
];

export const CATEGORY_TREE: CatDef[] = [
  {
    slug: "fashion",
    name: ["Одежда, обувь и аксессуары", "Kiyim, poyabzal va aksessuarlar", "Clothing, shoes & accessories"],
    icon: "shirt",
    children: [
      { slug: "mens-clothing", name: ["Мужская одежда", "Erkaklar kiyimi", "Men's clothing"], attrs: clothing },
      { slug: "womens-clothing", name: ["Женская одежда", "Ayollar kiyimi", "Women's clothing"], attrs: clothing },
      { slug: "kids-clothing", name: ["Детская одежда", "Bolalar kiyimi", "Kids' clothing"], attrs: [brand, kidsSize, color, defects] },
      { slug: "shoes", name: ["Обувь", "Poyabzal", "Shoes"], attrs: [brand, shoeSize, color, gender, material, defects] },
      { slug: "bags", name: ["Сумки и рюкзаки", "Sumkalar va ryukzaklar", "Bags & backpacks"], attrs: [brand, color, material, defects] },
      { slug: "jewelry-watches", name: ["Украшения и часы", "Taqinchoqlar va soatlar", "Jewelry & watches"], attrs: [brand, material, gender] },
      { slug: "vintage-designer", name: ["Винтаж и брендовые вещи", "Vintaj va brend buyumlar", "Vintage & designer"], attrs: [brand, color, material, defects] },
    ],
  },
  {
    slug: "electronics",
    name: ["Электроника", "Elektronika", "Electronics"],
    icon: "smartphone",
    children: [
      {
        slug: "smartphones",
        name: ["Смартфоны", "Smartfonlar", "Smartphones"],
        attrs: [
          {
            key: "manufacturer",
            label: ["Производитель", "Ishlab chiqaruvchi", "Manufacturer"],
            type: "select",
            required: true,
            filterable: true,
            options: [
              ["apple", "Apple", "Apple", "Apple"],
              ["samsung", "Samsung", "Samsung", "Samsung"],
              ["xiaomi", "Xiaomi", "Xiaomi", "Xiaomi"],
              ["redmi", "Redmi", "Redmi", "Redmi"],
              ["honor", "Honor", "Honor", "Honor"],
              ["huawei", "Huawei", "Huawei", "Huawei"],
              ["google", "Google", "Google", "Google"],
              ["vivo", "Vivo", "Vivo", "Vivo"],
              ["oppo", "Oppo", "Oppo", "Oppo"],
              ["realme", "Realme", "Realme", "Realme"],
              ["tecno", "Tecno", "Tecno", "Tecno"],
              ["other", "Другой", "Boshqa", "Other"],
            ],
          },
          { key: "model", label: ["Модель", "Model", "Model"], type: "text", required: true, maxLength: 60 },
          {
            key: "storage",
            label: ["Память", "Xotira", "Storage"],
            type: "select",
            filterable: true,
            options: ["32", "64", "128", "256", "512", "1024"].map((v) => [v, `${v === "1024" ? "1 ТБ" : v + " ГБ"}`, `${v === "1024" ? "1 TB" : v + " GB"}`, `${v === "1024" ? "1 TB" : v + " GB"}`] as Opt),
          },
          color,
          completeness,
          warranty,
        ],
      },
      {
        slug: "laptops-computers",
        name: ["Ноутбуки и компьютеры", "Noutbuklar va kompyuterlar", "Laptops & computers"],
        attrs: [brand, { key: "model", label: ["Модель", "Model", "Model"], type: "text", maxLength: 80 }, { key: "ram_gb", label: ["Оперативная память", "Operativ xotira", "RAM"], type: "number", unit: "GB", filterable: true, min: 1, max: 512 }, { key: "storage_gb", label: ["Накопитель", "Disk", "Storage"], type: "number", unit: "GB", min: 16, max: 16000 }, warranty],
      },
      { slug: "computer-parts", name: ["Комплектующие", "Butlovchi qismlar", "Computer parts"], attrs: [brand, { key: "model", label: ["Модель", "Model", "Model"], type: "text", maxLength: 80 }, warranty] },
      { slug: "game-consoles", name: ["Игровые консоли", "Oʻyin konsollari", "Game consoles"], attrs: [brand, completeness, warranty] },
      { slug: "photo-video", name: ["Фото- и видеотехника", "Foto va video texnika", "Photo & video"], attrs: [brand, { key: "model", label: ["Модель", "Model", "Model"], type: "text", maxLength: 80 }, completeness, warranty] },
      { slug: "tv-audio", name: ["Телевизоры и аудио", "Televizorlar va audio", "TV & audio"], attrs: [brand, { key: "screen_inches", label: ["Диагональ", "Diagonal", "Screen size"], type: "number", unit: "″", min: 10, max: 120 }, warranty] },
      { slug: "home-appliances", name: ["Бытовая техника", "Maishiy texnika", "Home appliances"], attrs: [brand, color, warranty] },
    ],
  },
  {
    slug: "flowers-gifts",
    name: ["Цветы и подарки", "Gullar va sovgʻalar", "Flowers & gifts"],
    icon: "flower",
    hasCondition: false,
    children: [
      {
        slug: "bouquets",
        name: ["Букеты", "Guldastalar", "Bouquets"],
        attrs: [
          {
            key: "bouquet_type",
            label: ["Тип букета", "Guldasta turi", "Bouquet type"],
            type: "select",
            filterable: true,
            options: [
              ["mono", "Монобукет", "Monoguldasta", "Mono bouquet"],
              ["mixed", "Сборный", "Aralash", "Mixed"],
              ["box", "В коробке", "Qutida", "In a box"],
              ["basket", "Корзина", "Savat", "Basket"],
              ["wedding", "Свадебный", "Toʻy uchun", "Wedding"],
            ],
          },
          { key: "composition", label: ["Состав", "Tarkibi", "Composition"], type: "text", maxLength: 300 },
          {
            key: "bouquet_size",
            label: ["Размер", "Oʻlcham", "Size"],
            type: "select",
            filterable: true,
            options: [
              ["s", "Маленький", "Kichik", "Small"],
              ["m", "Средний", "Oʻrta", "Medium"],
              ["l", "Большой", "Katta", "Large"],
            ],
          },
          { key: "in_stock", label: ["В наличии", "Mavjud", "In stock"], type: "boolean", filterable: true },
          { key: "available_date", label: ["Доступная дата", "Mavjud sana", "Available date"], type: "date" },
          deliveryAttr,
        ],
      },
      { slug: "house-plants", name: ["Комнатные растения", "Xona oʻsimliklari", "House plants"], attrs: [{ key: "pot_included", label: ["С горшком", "Tuvak bilan", "With pot"], type: "boolean" }, deliveryAttr] },
      { slug: "garden-plants", name: ["Садовые растения", "Bogʻ oʻsimliklari", "Garden plants"], attrs: [deliveryAttr] },
      { slug: "gift-sets", name: ["Подарочные наборы", "Sovgʻa toʻplamlari", "Gift sets"], attrs: [{ key: "composition", label: ["Состав", "Tarkibi", "Composition"], type: "text", maxLength: 300 }, deliveryAttr] },
      { slug: "event-decor", name: ["Декор для мероприятий", "Tadbirlar uchun bezak", "Event decor"], types: ["sale", "rent", "service"], attrs: [deliveryAttr] },
    ],
  },
  {
    slug: "transport",
    name: ["Автомобили и транспорт", "Avtomobillar va transport", "Cars & vehicles"],
    icon: "car",
    highValue: true,
    children: [
      {
        slug: "cars",
        name: ["Легковые автомобили", "Yengil avtomobillar", "Cars"],
        attrs: [
          {
            key: "make",
            label: ["Марка", "Marka", "Make"],
            type: "select",
            required: true,
            filterable: true,
            options: [
              ["chevrolet", "Chevrolet", "Chevrolet", "Chevrolet"],
              ["ravon", "Ravon", "Ravon", "Ravon"],
              ["daewoo", "Daewoo", "Daewoo", "Daewoo"],
              ["kia", "Kia", "Kia", "Kia"],
              ["hyundai", "Hyundai", "Hyundai", "Hyundai"],
              ["toyota", "Toyota", "Toyota", "Toyota"],
              ["byd", "BYD", "BYD", "BYD"],
              ["chery", "Chery", "Chery", "Chery"],
              ["lada", "LADA", "LADA", "LADA"],
              ["mercedes", "Mercedes-Benz", "Mercedes-Benz", "Mercedes-Benz"],
              ["bmw", "BMW", "BMW", "BMW"],
              ["other", "Другая", "Boshqa", "Other"],
            ],
          },
          { key: "model", label: ["Модель", "Model", "Model"], type: "text", required: true, maxLength: 60 },
          year,
          mileage,
          fuel,
          transmission,
          {
            key: "body_type",
            label: ["Тип кузова", "Kuzov turi", "Body type"],
            type: "select",
            filterable: true,
            options: [
              ["sedan", "Седан", "Sedan", "Sedan"],
              ["hatchback", "Хэтчбек", "Xetchbek", "Hatchback"],
              ["suv", "Внедорожник / кроссовер", "Yoʻltanlamas / krossover", "SUV / crossover"],
              ["wagon", "Универсал", "Universal", "Wagon"],
              ["minivan", "Минивэн", "Miniven", "Minivan"],
              ["coupe", "Купе", "Kupe", "Coupe"],
              ["pickup", "Пикап", "Pikap", "Pickup"],
            ],
          },
          color,
        ],
      },
      { slug: "motorcycles", name: ["Мотоциклы", "Mototsikllar", "Motorcycles"], attrs: [brand, year, mileage] },
      { slug: "commercial-vehicles", name: ["Коммерческий транспорт", "Tijorat transporti", "Commercial vehicles"], attrs: [brand, year, mileage, fuel] },
      { slug: "auto-parts", name: ["Запчасти", "Ehtiyot qismlar", "Auto parts"], highValue: false, attrs: [brand, { key: "fits", label: ["Подходит для", "Mos keladi", "Fits"], type: "text", maxLength: 120 }] },
      { slug: "tires-wheels", name: ["Шины и диски", "Shinalar va disklar", "Tires & wheels"], highValue: false, attrs: [brand, { key: "radius", label: ["Радиус", "Radius", "Radius"], type: "number", unit: "R", filterable: true, min: 10, max: 24 }] },
      { slug: "auto-accessories", name: ["Автоаксессуары", "Avtoaksessuarlar", "Car accessories"], highValue: false, attrs: [brand] },
    ],
  },
  {
    slug: "home",
    name: ["Дом и интерьер", "Uy va interyer", "Home & interior"],
    icon: "sofa",
    children: [
      { slug: "furniture", name: ["Мебель", "Mebel", "Furniture"], attrs: [material, color, deliveryAttr] },
      { slug: "lighting", name: ["Освещение", "Yoritish", "Lighting"], attrs: [brand] },
      { slug: "kitchenware", name: ["Кухонные товары", "Oshxona buyumlari", "Kitchenware"], attrs: [brand, material] },
      { slug: "decor", name: ["Предметы интерьера", "Interyer buyumlari", "Home decor"], attrs: [material, color] },
      { slug: "renovation", name: ["Товары для ремонта", "Taʼmirlash uchun mahsulotlar", "Renovation supplies"], attrs: [brand] },
    ],
  },
  { slug: "kids", name: ["Детские товары", "Bolalar mahsulotlari", "Kids & baby"], icon: "baby", attrs: [brand, { key: "age", label: ["Возраст", "Yosh", "Age"], type: "text", maxLength: 40 }] },
  { slug: "sport-hobby", name: ["Спорт, туризм и хобби", "Sport, turizm va xobbi", "Sports, travel & hobby"], icon: "bike", types: ["sale", "rent"], attrs: [brand] },
  { slug: "beauty", name: ["Красота и уход", "Goʻzallik va parvarish", "Beauty & care"], icon: "sparkles", attrs: [brand, { key: "sealed", label: ["Запечатано", "Ochilmagan", "Sealed"], type: "boolean", filterable: true }] },
  { slug: "books-music-collectibles", name: ["Книги, музыка и коллекционные предметы", "Kitoblar, musiqa va kolleksiya buyumlari", "Books, music & collectibles"], icon: "book", attrs: [{ key: "author", label: ["Автор / исполнитель", "Muallif / ijrochi", "Author / artist"], type: "text", maxLength: 100 }] },
  {
    slug: "rent",
    name: ["Аренда", "Ijara", "Rentals"],
    icon: "key",
    types: ["rent"],
    attrs: rentAttrs,
    children: [
      { slug: "rent-tools", name: ["Инструменты", "Asboblar", "Tools"], types: ["rent"] },
      { slug: "rent-photo-video", name: ["Фото- и видеотехника", "Foto va video texnika", "Photo & video gear"], types: ["rent"] },
      { slug: "rent-equipment", name: ["Оборудование", "Uskunalar", "Equipment"], types: ["rent"] },
      { slug: "rent-transport", name: ["Транспорт", "Transport", "Vehicles"], types: ["rent"], highValue: true },
      { slug: "rent-other", name: ["Другие предметы", "Boshqa buyumlar", "Other items"], types: ["rent"] },
    ],
  },
  {
    slug: "services",
    name: ["Услуги", "Xizmatlar", "Services"],
    icon: "wrench",
    types: ["service"],
    hasCondition: false,
    attrs: serviceAttrs,
    children: [
      { slug: "repair", name: ["Ремонт", "Taʼmirlash", "Repair"], types: ["service"] },
      { slug: "education", name: ["Образование", "Taʼlim", "Education"], types: ["service"] },
      { slug: "design", name: ["Дизайн", "Dizayn", "Design"], types: ["service"] },
      { slug: "web-development", name: ["Разработка сайтов", "Veb-saytlar yaratish", "Web development"], types: ["service"] },
      { slug: "photo-video-services", name: ["Фото- и видеосъёмка", "Foto va video suratga olish", "Photo & video shooting"], types: ["service"] },
      { slug: "other-services", name: ["Другие услуги", "Boshqa xizmatlar", "Other services"], types: ["service"] },
    ],
  },
  { slug: "other", name: ["Другое", "Boshqa", "Other"], icon: "package", types: ["sale", "rent"] },
];
