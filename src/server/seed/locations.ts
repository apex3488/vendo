/** Regions and main cities of Uzbekistan: [slug, ru, uz, en]. */
type Loc = [string, string, string, string];

export const REGIONS: { region: Loc; cities: Loc[] }[] = [
  {
    region: ["tashkent-city", "Ташкент", "Toshkent shahri", "Tashkent City"],
    cities: [["tashkent", "Ташкент", "Toshkent", "Tashkent"]],
  },
  {
    region: ["tashkent-region", "Ташкентская область", "Toshkent viloyati", "Tashkent Region"],
    cities: [
      ["chirchiq", "Чирчик", "Chirchiq", "Chirchiq"],
      ["angren", "Ангрен", "Angren", "Angren"],
      ["olmaliq", "Алмалык", "Olmaliq", "Almalyk"],
      ["nurafshon", "Нурафшан", "Nurafshon", "Nurafshon"],
      ["bekobod", "Бекабад", "Bekobod", "Bekabad"],
      ["yangiyul", "Янгиюль", "Yangiyoʻl", "Yangiyul"],
    ],
  },
  {
    region: ["samarkand-region", "Самаркандская область", "Samarqand viloyati", "Samarkand Region"],
    cities: [
      ["samarkand", "Самарканд", "Samarqand", "Samarkand"],
      ["kattakurgan", "Каттакурган", "Kattaqoʻrgʻon", "Kattakurgan"],
      ["urgut", "Ургут", "Urgut", "Urgut"],
    ],
  },
  {
    region: ["bukhara-region", "Бухарская область", "Buxoro viloyati", "Bukhara Region"],
    cities: [
      ["bukhara", "Бухара", "Buxoro", "Bukhara"],
      ["kagan", "Каган", "Kogon", "Kagan"],
      ["gijduvan", "Гиждуван", "Gʻijduvon", "Gijduvan"],
    ],
  },
  {
    region: ["fergana-region", "Ферганская область", "Fargʻona viloyati", "Fergana Region"],
    cities: [
      ["fergana", "Фергана", "Fargʻona", "Fergana"],
      ["kokand", "Коканд", "Qoʻqon", "Kokand"],
      ["margilan", "Маргилан", "Margʻilon", "Margilan"],
      ["kuvasay", "Кувасай", "Quvasoy", "Kuvasay"],
    ],
  },
  {
    region: ["andijan-region", "Андижанская область", "Andijon viloyati", "Andijan Region"],
    cities: [
      ["andijan", "Андижан", "Andijon", "Andijan"],
      ["asaka", "Асака", "Asaka", "Asaka"],
      ["khanabad", "Ханабад", "Xonobod", "Khanabad"],
    ],
  },
  {
    region: ["namangan-region", "Наманганская область", "Namangan viloyati", "Namangan Region"],
    cities: [
      ["namangan", "Наманган", "Namangan", "Namangan"],
      ["chust", "Чуст", "Chust", "Chust"],
    ],
  },
  {
    region: ["kashkadarya-region", "Кашкадарьинская область", "Qashqadaryo viloyati", "Kashkadarya Region"],
    cities: [
      ["karshi", "Карши", "Qarshi", "Karshi"],
      ["shakhrisabz", "Шахрисабз", "Shahrisabz", "Shakhrisabz"],
    ],
  },
  {
    region: ["surkhandarya-region", "Сурхандарьинская область", "Surxondaryo viloyati", "Surkhandarya Region"],
    cities: [
      ["termez", "Термез", "Termiz", "Termez"],
      ["denau", "Денау", "Denov", "Denau"],
    ],
  },
  {
    region: ["khorezm-region", "Хорезмская область", "Xorazm viloyati", "Khorezm Region"],
    cities: [
      ["urgench", "Ургенч", "Urganch", "Urgench"],
      ["khiva", "Хива", "Xiva", "Khiva"],
    ],
  },
  {
    region: ["navoi-region", "Навоийская область", "Navoiy viloyati", "Navoi Region"],
    cities: [
      ["navoi", "Навои", "Navoiy", "Navoi"],
      ["zarafshan", "Зарафшан", "Zarafshon", "Zarafshan"],
    ],
  },
  {
    region: ["jizzakh-region", "Джизакская область", "Jizzax viloyati", "Jizzakh Region"],
    cities: [["jizzakh", "Джизак", "Jizzax", "Jizzakh"]],
  },
  {
    region: ["syrdarya-region", "Сырдарьинская область", "Sirdaryo viloyati", "Syrdarya Region"],
    cities: [
      ["gulistan", "Гулистан", "Guliston", "Gulistan"],
      ["yangiyer", "Янгиер", "Yangiyer", "Yangiyer"],
    ],
  },
  {
    region: ["karakalpakstan", "Республика Каракалпакстан", "Qoraqalpogʻiston Respublikasi", "Karakalpakstan"],
    cities: [
      ["nukus", "Нукус", "Nukus", "Nukus"],
      ["khodjeyli", "Ходжейли", "Xoʻjayli", "Khojeli"],
    ],
  },
];
