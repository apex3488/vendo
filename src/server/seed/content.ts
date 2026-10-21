import type { I18nText } from "../db/schema";

/**
 * Initial help/legal content. Legal pages are DRAFTS and must be reviewed by a lawyer
 * before public launch (see PROJECT_STATUS.md). Editable in /admin/content.
 */
export const PAGES: { slug: string; kind: "page" | "faq"; sort: number; title: I18nText; body: I18nText }[] = [
  {
    slug: "about",
    kind: "page",
    sort: 1,
    title: { ru: "О платформе", uz: "Platforma haqida", en: "About VENDO" },
    body: {
      ru: "VENDO — площадка объявлений, где люди и магазины публикуют товары, аренду и услуги.\n\n## Как это работает\n- Продавец размещает объявление и указывает телефон и/или Telegram.\n- Покупатель связывается с продавцом напрямую.\n- Цену, осмотр, доставку и оплату стороны согласуют самостоятельно.\n\nVENDO не принимает оплату за товары, не хранит деньги сторон и не является гарантом сделки, качества товара или доставки.",
      uz: "VENDO — odamlar va doʻkonlar mahsulotlar, ijara va xizmatlarni joylashtiradigan eʼlonlar maydonchasi.\n\n## Qanday ishlaydi\n- Sotuvchi eʼlon joylashtiradi va telefon va/yoki Telegramni koʻrsatadi.\n- Xaridor sotuvchi bilan bevosita bogʻlanadi.\n- Narx, koʻrik, yetkazib berish va toʻlovni tomonlar oʻzaro kelishadi.\n\nVENDO mahsulotlar uchun toʻlov qabul qilmaydi, tomonlarning pulini saqlamaydi va bitim, mahsulot sifati yoki yetkazib berish kafili emas.",
      en: "VENDO is a classifieds platform where people and shops post items, rentals and services.\n\n## How it works\n- The seller posts a listing with a phone number and/or Telegram.\n- The buyer contacts the seller directly.\n- Price, inspection, delivery and payment are agreed between the parties.\n\nVENDO does not accept payment for goods, does not hold anyone's money and does not guarantee deals, item quality or delivery.",
    },
  },
  {
    slug: "safety",
    kind: "page",
    sort: 2,
    title: { ru: "Безопасные сделки", uz: "Xavfsiz bitimlar", en: "Safe deals" },
    body: {
      ru: "## Перед покупкой\n- Осматривайте товар лично и проверяйте его работу.\n- Встречайтесь в людных местах.\n- Не переводите предоплату незнакомым продавцам.\n- Не сообщайте никому коды из SMS и данные банковских карт.\n\n## Автомобили и дорогие товары\n- Самостоятельно проверяйте документы, VIN, историю и юридическую чистоту.\n- Сверяйте данные продавца с документами.\n- По возможности привлекайте независимого специалиста.\n\nVENDO не проверяет товары и не участвует в расчётах. Если объявление кажется подозрительным — нажмите «Пожаловаться».",
      uz: "## Xariddan oldin\n- Mahsulotni shaxsan koʻring va ishlashini tekshiring.\n- Gavjum joylarda uchrashing.\n- Notanish sotuvchilarga oldindan toʻlov qilmang.\n- SMS kodlari va bank kartasi maʼlumotlarini hech kimga bermang.\n\n## Avtomobillar va qimmat mahsulotlar\n- Hujjatlar, VIN, tarix va yuridik tozalikni mustaqil tekshiring.\n- Sotuvchi maʼlumotlarini hujjatlar bilan solishtiring.\n- Imkon boʻlsa, mustaqil mutaxassisni jalb qiling.\n\nVENDO mahsulotlarni tekshirmaydi va hisob-kitoblarda ishtirok etmaydi. Eʼlon shubhali boʻlsa — «Shikoyat qilish» tugmasini bosing.",
      en: "## Before you buy\n- Inspect the item in person and check that it works.\n- Meet in public places.\n- Do not send prepayments to unknown sellers.\n- Never share SMS codes or bank card details.\n\n## Cars and high-value items\n- Check documents, VIN, history and legal status yourself.\n- Make sure the seller's details match the documents.\n- Consider bringing an independent expert.\n\nVENDO does not inspect items and is not involved in payments. If a listing looks suspicious, press “Report”.",
    },
  },
  {
    slug: "rules",
    kind: "page",
    sort: 3,
    title: { ru: "Правила размещения", uz: "Joylashtirish qoidalari", en: "Posting rules" },
    body: {
      ru: "## Общие правила\n- Одно объявление — один товар или услуга.\n- Фотографии и описание должны соответствовать реальному товару.\n- Цена указывается честно, без скрытых условий.\n- Контакты должны принадлежать автору объявления.\n- Запрещены дубли, спам и вводящие в заблуждение заголовки.\n\n## Запрещено к размещению\n- Оружие, боеприпасы и взрывчатые вещества.\n- Наркотические и психотропные вещества, рецептурные лекарства.\n- Алкоголь и табак — в нарушение законодательства.\n- Поддельные товары и документы, краденое имущество.\n- Персональные данные, базы данных, взломанные аккаунты.\n- Животные из Красной книги и запрещённые к обороту объекты.\n- Услуги интимного характера, азартные игры, финансовые пирамиды.\n- Любые товары и услуги, запрещённые законодательством Республики Узбекистан.\n\nНарушающие правила объявления отклоняются или блокируются. При повторных нарушениях аккаунт может быть заблокирован.",
      uz: "## Umumiy qoidalar\n- Bitta eʼlon — bitta mahsulot yoki xizmat.\n- Rasmlar va tavsif haqiqiy mahsulotga mos boʻlishi kerak.\n- Narx yashirin shartlarsiz halol koʻrsatiladi.\n- Kontaktlar eʼlon muallifiga tegishli boʻlishi kerak.\n- Takroriy eʼlonlar, spam va chalgʻituvchi sarlavhalar taqiqlanadi.\n\n## Joylashtirish taqiqlanadi\n- Qurol, oʻq-dorilar va portlovchi moddalar.\n- Giyohvand va psixotrop moddalar, retsept boʻyicha dorilar.\n- Qonunni buzgan holda alkogol va tamaki.\n- Soxta mahsulotlar va hujjatlar, oʻgʻirlangan mulk.\n- Shaxsiy maʼlumotlar, maʼlumotlar bazalari, buzilgan akkauntlar.\n- Qizil kitobga kiritilgan hayvonlar va muomalasi taqiqlangan obyektlar.\n- Intim xizmatlar, qimor oʻyinlari, moliyaviy piramidalar.\n- Oʻzbekiston Respublikasi qonunchiligida taqiqlangan har qanday mahsulot va xizmatlar.\n\nQoidalarni buzgan eʼlonlar rad etiladi yoki bloklanadi. Takroriy buzilishlarda akkaunt bloklanishi mumkin.",
      en: "## General rules\n- One listing — one item or service.\n- Photos and description must match the real item.\n- Prices must be honest, with no hidden conditions.\n- Contacts must belong to the listing's author.\n- Duplicates, spam and misleading titles are not allowed.\n\n## Prohibited\n- Weapons, ammunition and explosives.\n- Narcotic and psychotropic substances, prescription drugs.\n- Alcohol and tobacco in violation of the law.\n- Counterfeit goods and documents, stolen property.\n- Personal data, databases, hacked accounts.\n- Endangered animals and items banned from circulation.\n- Sexual services, gambling, pyramid schemes.\n- Any goods and services prohibited by the laws of the Republic of Uzbekistan.\n\nListings that break the rules are rejected or blocked. Repeated violations may lead to account suspension.",
    },
  },
  {
    slug: "terms",
    kind: "page",
    sort: 4,
    title: { ru: "Условия использования", uz: "Foydalanish shartlari", en: "Terms of use" },
    body: {
      ru: "Черновик. Перед публичным запуском текст должен быть проверен юристом.\n\n## 1. Предмет\nVENDO предоставляет сервис размещения объявлений. Сделки заключаются между пользователями напрямую, без участия VENDO.\n\n## 2. Ответственность пользователей\nПользователь отвечает за достоверность объявлений, законность товаров и услуг и соблюдение Правил размещения.\n\n## 3. Ограничение ответственности\nVENDO не является стороной сделок, не гарантирует качество, безопасность и законность товаров, исполнение обязательств сторонами и не хранит денежные средства пользователей.\n\n## 4. Платные услуги\nПлатные услуги (продвижение, подписки, реклама) активируются только после подтверждённой оплаты. Условия и цены публикуются на сайте.\n\n## 5. Модерация\nVENDO вправе отклонять, снимать с публикации и блокировать объявления и аккаунты, нарушающие правила.",
      uz: "Qoralama. Ommaviy ishga tushirishdan oldin matn yurist tomonidan tekshirilishi kerak.\n\n## 1. Predmet\nVENDO eʼlonlarni joylashtirish xizmatini taqdim etadi. Bitimlar foydalanuvchilar oʻrtasida VENDO ishtirokisiz tuziladi.\n\n## 2. Foydalanuvchilar javobgarligi\nFoydalanuvchi eʼlonlarning toʻgʻriligi, mahsulot va xizmatlarning qonuniyligi va qoidalarga rioya qilish uchun javobgardir.\n\n## 3. Javobgarlikni cheklash\nVENDO bitim tarafi emas, mahsulotlarning sifati, xavfsizligi va qonuniyligini, tomonlar majburiyatlarining bajarilishini kafolatlamaydi va foydalanuvchilar pulini saqlamaydi.\n\n## 4. Pullik xizmatlar\nPullik xizmatlar faqat tasdiqlangan toʻlovdan soʻng faollashtiriladi.\n\n## 5. Moderatsiya\nVENDO qoidalarni buzgan eʼlon va akkauntlarni rad etish, olib tashlash va bloklash huquqiga ega.",
      en: "Draft. The text must be reviewed by a lawyer before public launch.\n\n## 1. Subject\nVENDO provides a listing service. Deals are made directly between users, without VENDO's participation.\n\n## 2. User responsibility\nUsers are responsible for the accuracy of listings, the legality of goods and services and compliance with the Posting rules.\n\n## 3. Limitation of liability\nVENDO is not a party to deals, does not guarantee quality, safety or legality of items or performance of obligations, and does not hold users' money.\n\n## 4. Paid services\nPaid services are activated only after a confirmed payment.\n\n## 5. Moderation\nVENDO may reject, unpublish and block listings and accounts that break the rules.",
    },
  },
  {
    slug: "privacy",
    kind: "page",
    sort: 5,
    title: { ru: "Политика конфиденциальности", uz: "Maxfiylik siyosati", en: "Privacy policy" },
    body: {
      ru: "Черновик. Перед публичным запуском текст должен быть проверен юристом с учётом закона Республики Узбекистан «О персональных данных».\n\n## Какие данные мы собираем\n- Имя, email и пароль (в виде хеша) — для входа.\n- Телефон и Telegram — только если вы указали их сами.\n- Город — для показа объявлений рядом.\n- Обезличенная статистика просмотров и нажатий на кнопки связи по дням.\n\n## Что мы не делаем\n- Не продаём персональные данные.\n- Не отслеживаем ваши переговоры и сделки вне платформы.\n- Не показываем телефон в профиле без вашего согласия.\n\n## Ваши права\nВы можете изменить данные в настройках профиля или запросить удаление аккаунта через поддержку.",
      uz: "Qoralama. Ommaviy ishga tushirishdan oldin matn «Shaxsga doir maʼlumotlar toʻgʻrisida»gi qonunni hisobga olgan holda yurist tomonidan tekshirilishi kerak.\n\n## Qanday maʼlumotlarni yigʻamiz\n- Ism, email va parol (xesh koʻrinishida) — kirish uchun.\n- Telefon va Telegram — faqat oʻzingiz koʻrsatgan boʻlsangiz.\n- Shahar — yaqin eʼlonlarni koʻrsatish uchun.\n- Kunlik koʻrishlar va aloqa tugmalari bosilishi boʻyicha anonim statistika.\n\n## Nima qilmaymiz\n- Shaxsiy maʼlumotlarni sotmaymiz.\n- Platformadan tashqaridagi muzokaralar va bitimlarni kuzatmaymiz.\n- Roziligingizsiz profilda telefonni koʻrsatmaymiz.\n\n## Huquqlaringiz\nMaʼlumotlarni profil sozlamalarida oʻzgartirishingiz yoki qoʻllab-quvvatlash orqali akkauntni oʻchirishni soʻrashingiz mumkin.",
      en: "Draft. The text must be reviewed by a lawyer before public launch, considering the Law of Uzbekistan “On Personal Data”.\n\n## What we collect\n- Name, email and password (as a hash) — to sign in.\n- Phone and Telegram — only if you provide them.\n- City — to show nearby listings.\n- Anonymous daily counts of views and contact button clicks.\n\n## What we don't do\n- We don't sell personal data.\n- We don't track your conversations or deals outside the platform.\n- We don't show your phone on your profile without your consent.\n\n## Your rights\nYou can change your data in profile settings or request account deletion via support.",
    },
  },
  {
    slug: "help",
    kind: "page",
    sort: 6,
    title: { ru: "Помощь", uz: "Yordam", en: "Help" },
    body: {
      ru: "## Как разместить объявление\nНажмите «Разместить объявление», выберите категорию и тип, заполните описание, цену, фото и контакты. После проверки модератором объявление появится в поиске.\n\n## Почему объявление отклонено\nПричина указана в разделе «Мои объявления → Отклонённые». Исправьте объявление и отправьте его повторно.\n\n## Как продвинуть объявление\nВ разделе «Продвижение» выберите объявление и тариф. Продвижение начинает действовать после подтверждения оплаты.",
      uz: "## Eʼlonni qanday joylashtirish mumkin\n«Eʼlon joylashtirish» tugmasini bosing, toifa va turni tanlang, tavsif, narx, rasmlar va kontaktlarni toʻldiring. Moderator tekshiruvidan soʻng eʼlon qidiruvda paydo boʻladi.\n\n## Nega eʼlon rad etildi\nSabab «Mening eʼlonlarim → Rad etilgan» boʻlimida koʻrsatilgan. Eʼlonni tuzating va qayta yuboring.\n\n## Eʼlonni qanday reklama qilish mumkin\n«Reklama» boʻlimida eʼlon va tarifni tanlang. Reklama toʻlov tasdiqlangandan soʻng kuchga kiradi.",
      en: "## How to post a listing\nPress “Post a listing”, choose a category and type, fill in the description, price, photos and contacts. After moderation the listing appears in search.\n\n## Why was my listing rejected\nThe reason is shown in “My listings → Rejected”. Fix the listing and submit it again.\n\n## How to promote a listing\nIn “Promotion”, choose a listing and a plan. Promotion starts after the payment is confirmed.",
    },
  },
  {
    slug: "faq-free",
    kind: "faq",
    sort: 10,
    title: { ru: "Размещение объявлений бесплатное?", uz: "Eʼlon joylashtirish bepulmi?", en: "Is posting free?" },
    body: {
      ru: "Да. Частные пользователи могут бесплатно держать активными ограниченное число объявлений. Лимит указан в личном кабинете.",
      uz: "Ha. Xususiy foydalanuvchilar cheklangan miqdordagi eʼlonlarni bepul faol saqlashlari mumkin. Limit shaxsiy kabinetda koʻrsatilgan.",
      en: "Yes. Private users can keep a limited number of listings active for free. The limit is shown in your account.",
    },
  },
  {
    slug: "faq-payment",
    kind: "faq",
    sort: 11,
    title: { ru: "Можно ли оплатить товар через VENDO?", uz: "Mahsulot uchun VENDO orqali toʻlash mumkinmi?", en: "Can I pay for an item through VENDO?" },
    body: {
      ru: "Нет. VENDO знакомит покупателя и продавца. Оплату и передачу товара стороны согласуют напрямую.",
      uz: "Yoʻq. VENDO xaridor va sotuvchini tanishtiradi. Toʻlov va mahsulotni topshirishni tomonlar bevosita kelishadi.",
      en: "No. VENDO connects buyers and sellers. Payment and handover are agreed directly between them.",
    },
  },
  {
    slug: "faq-moderation",
    kind: "faq",
    sort: 12,
    title: { ru: "Сколько длится модерация?", uz: "Moderatsiya qancha davom etadi?", en: "How long does moderation take?" },
    body: {
      ru: "Обычно в течение рабочего дня. Статус виден в разделе «Мои объявления».",
      uz: "Odatda ish kuni davomida. Holat «Mening eʼlonlarim» boʻlimida koʻrinadi.",
      en: "Usually within a business day. The status is shown in “My listings”.",
    },
  },
  {
    slug: "faq-store",
    kind: "faq",
    sort: 13,
    title: { ru: "Что даёт магазин на VENDO?", uz: "VENDOdagi doʻkon nima beradi?", en: "What does a store on VENDO give me?" },
    body: {
      ru: "Публичную страницу с каталогом, логотипом и контактами. Платные тарифы увеличивают лимит активных объявлений и открывают расширенную статистику.",
      uz: "Katalog, logotip va kontaktlar bilan ommaviy sahifa. Pullik tariflar faol eʼlonlar limitini oshiradi va kengaytirilgan statistikani ochadi.",
      en: "A public page with your catalog, logo and contacts. Paid plans raise the active listing limit and unlock extended analytics.",
    },
  },
];
