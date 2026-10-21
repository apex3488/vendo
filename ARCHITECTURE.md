# VENDO — архитектура

## Стек

| Слой | Решение | Почему |
|---|---|---|
| Фреймворк | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict | SSR для SEO, Server Actions для форм, один репозиторий для сайта и API |
| Стили | Tailwind CSS v4 + собственные токены (`src/app/globals.css`) | Быстро, без тяжёлых UI-библиотек |
| БД | PostgreSQL через Drizzle ORM | Реляционная модель, миграции в SQL, типобезопасные запросы |
| Локальная БД | PGlite (PostgreSQL 18 в WASM, файл `./.data/pglite`) | Ноль установки на Windows; тот же SQL, что в продакшене |
| Прод-БД | Любой PostgreSQL по `DATABASE_URL` (рекомендуется Supabase / Neon) | Переключение одной переменной |
| Изображения | sharp (проверка, ресайз, WebP, удаление EXIF) + адаптер хранилища | `local` для разработки, `supabase` (Storage REST) для продакшена |
| Валидация | zod на сервере | Все входные данные проверяются в сервисах |
| Авторизация | Собственные сессии (scrypt + случайный токен, в БД хранится только SHA-256) | Нет зависимости от внешнего провайдера, вход по email **или логину** |
| Тесты | Vitest + PGlite in-memory | Тесты идут на настоящем PostgreSQL |

`cacheComponents` в Next.js отключён осознанно: почти все страницы зависят от сессии/cookie и БД, классическая динамическая отрисовка проще и предсказуемее.

## Модули (`src/server/services`)

| Модуль | Файл |
|---|---|
| Authentication / Users | `users.ts`, `../auth/*` |
| Categories + Attributes | `categories.ts` |
| Listings (+ moderation, status history) | `listings.ts`, `admin-listings.ts` |
| Search (FTS + trigram + атрибутные фильтры) | `search.ts` |
| Favorites + Analytics (дневные агрегаты) | `engagement.ts` |
| Images | `images.ts`, `../storage.ts` |
| Stores | `stores.ts` |
| Subscriptions / Promotions / Advertising | `monetization.ts` |
| Reports (жалобы) | `reports.ts` |
| Notifications | `notifications.ts` |
| Content (страницы, FAQ, подборки) | `content.ts` |
| Settings | `settings.ts` |
| Audit | `audit.ts`, `admin-stats.ts` |
| Rate limiting | `rate-limit.ts` (в PostgreSQL, работает на нескольких инстансах) |
| Maintenance (истечение объявлений/платных функций) | `maintenance.ts`, `/api/cron/maintenance` |
| Localization | `src/lib/i18n` (ru / uz / en, cookie `vendo_locale`) |

Правило: страницы и Server Actions — тонкий слой. Вся бизнес-логика и проверки прав — в сервисах, которые покрыты тестами и не зависят от Next.js (можно переиспользовать для мобильного приложения/API).

## Маршруты

- Публичные: `/`, `/search`, `/c/[slug]`, `/l/[id-slug]`, `/store/[slug]`, `/u/[id]`, `/plans`, `/p/[slug]`, `/sitemap.xml`, `/robots.txt`
- Аккаунт: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/post`, `/post/[id]`, `/account/*`
- Админ: `/admin/*` (404 для всех без права `admin.access`)
- API: `/api/search/suggest`, `/api/listings/[id]/images` (загрузка), `/api/ads/[id]/click`, `/api/cron/maintenance`, `/media/[...key]`

## Ключевые решения

- **Категории и характеристики только из БД.** Атрибуты наследуются от родительских категорий. Типы: text, number, select, multiselect, boolean, date; обязательность, фильтруемость, min/max, длина.
- **Поиск** — PostgreSQL: `tsvector` (generated column, конфигурация `simple` для смешанных ru/uz текстов, префиксный поиск) + `ILIKE` по заголовку с GIN-trigram индексом. Все фильтры, сортировки и пагинация — в SQL. Внешний поисковый движок не нужен до десятков тысяч активных объявлений.
- **Контакты** хранятся только нормализованными: телефон E.164, Telegram — голое имя пользователя. Ссылки строятся только как `tel:+…` и `https://t.me/…`, поэтому произвольные схемы URL невозможны.
- **Скрытый телефон** раскрывается Server Action по клику, с лимитом частоты (защита от массового сбора номеров).
- **Монетизация без имитации оплаты.** Заявки создаются в статусе `pending_payment`. Активация — только (а) через будущий вебхук провайдера (таблица `payments`), или (б) сотрудником с правом `monetization.manage` с обязательным комментарием, который пишется в журнал.
- **Продвижение** не обещает позиций: `bump` двигает `ranked_at` (сортировка «новые»), `highlight` — визуальное выделение, `featured` — отдельный блок «Рекомендуем», помеченный как продвижение.

## Подключение онлайн-оплаты (следующий этап)

1. Заключить договор с провайдером (Payme, Click, Uzum Bank и т. п.), получить тестовые ключи.
2. Добавить `src/server/payments/<provider>.ts`: создание счёта → запись в `payments (status=pending)`.
3. Добавить вебхук `/api/payments/<provider>` с проверкой подписи провайдера; при успехе — `payments.status = succeeded` и вызов той же функции применения, что и при ручной активации (`applyPromotion` / активация подписки) с `activationSource = "payment"`.
4. Включить способы оплаты в настройках (`paymentMethods`).

## Масштабирование

- Stateless-сервер: сессии, лимиты и данные — в PostgreSQL, файлы — во внешнем хранилище → горизонтальное масштабирование.
- При росте: отдельный read-replica для поиска, кэш популярных выборок, при необходимости Meilisearch/OpenSearch.
