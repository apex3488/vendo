# VENDO

**Find it. Sell it. Live it.** — площадка объявлений и маркетплейс для Узбекистана и СНГ: продажа, аренда и услуги. Покупатель связывается с продавцом напрямую по телефону или в Telegram.

Документация: [ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) · [SECURITY.md](SECURITY.md) · [ROADMAP.md](ROADMAP.md) · [PROJECT_STATUS.md](PROJECT_STATUS.md)

## Локальный запуск (Windows / macOS / Linux)

Нужен только Node.js ≥ 20.9. База данных встроенная (PGlite) — устанавливать PostgreSQL не нужно.

```bash
npm install
cp .env.example .env.local        # затем задайте APP_SECRET
npm run db:seed                   # миграции + регионы, категории, тарифы, страницы
ADMIN_USERNAME=<логин> ADMIN_PASSWORD=<пароль> npm run admin:create
npm run dev                       # http://localhost:3000
```

В PowerShell переменные задаются так:

```powershell
$env:ADMIN_USERNAME="<логин>"; $env:ADMIN_PASSWORD="<пароль>"; npm run admin:create
```

> Встроенная БД открывается одним процессом. Перед `db:seed`, `admin:create`, `db:demo` остановите `npm run dev`/`npm start`.

Тестовые данные для проверки интерфейса (помечены «[ТЕСТ]», не для продакшена):

```bash
npm run db:demo          # создать
npm run db:demo:clear    # удалить
```

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` / `build` / `start` | Разработка / сборка / продакшен-сервер |
| `npm test` | Автотесты (Vitest + PostgreSQL в памяти) |
| `npm run typecheck`, `npm run lint` | Проверки TypeScript и ESLint |
| `npm run db:generate` | Сгенерировать миграцию после изменения схемы |
| `npm run db:migrate` | Применить миграции к `DATABASE_URL` |
| `npm run db:seed` | Справочные данные (идемпотентно, правки админов не перезаписывает) |
| `npm run admin:create` | Создать/сбросить Super Admin |

## Деплой на Vercel (текущая схема)

Vercel + Neon Postgres (Vercel → Storage) + Vercel Blob для фото. Репозиторий подключён к проекту Vercel, каждый push в `main` выкатывается автоматически. Перед сборкой production `scripts/vercel-build.ts` применяет миграции, справочные данные и создаёт Super Admin из `ADMIN_USERNAME` / `ADMIN_PASSWORD`, если его ещё нет. Переменные: `DATABASE_URL` (Neon), `BLOB_READ_WRITE_TOKEN` (Blob), `STORAGE_DRIVER=vercel-blob`, `NEXT_PUBLIC_SITE_URL`, `APP_SECRET`, `CRON_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`. Обслуживание запускается Vercel Cron раз в сутки (`vercel.json`).

## Деплой (альтернатива: Supabase)

Рекомендуемая связка: **Supabase** (PostgreSQL + Storage) + **Vercel** (хостинг Next.js). Актуальные лимиты бесплатных тарифов и условия коммерческого использования проверьте перед запуском — они меняются (см. PROJECT_STATUS.md).

1. **Supabase**: создайте проект (регион ближе к пользователям, например Frankfurt / Singapore). Возьмите строку подключения *Transaction pooler* (порт 6543) → `DATABASE_URL`. Создайте публичный bucket `listing-images` в Storage.
2. Локально с `DATABASE_URL` из Supabase:
   ```bash
   npm run db:migrate
   npm run db:seed
   ADMIN_USERNAME=<логин> ADMIN_PASSWORD=<пароль> npm run admin:create
   ```
3. **Vercel**: импортируйте репозиторий, задайте переменные окружения:
   `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `APP_SECRET`, `CRON_SECRET`, `MAIL_DRIVER=resend`, `RESEND_API_KEY`, `MAIL_FROM`.
4. Настройте ежедневный вызов `GET /api/cron/maintenance` с заголовком `Authorization: Bearer $CRON_SECRET` (Vercel Cron или любой внешний планировщик).
5. Подключите домен и проверьте `/robots.txt`, `/sitemap.xml`.

Альтернатива — свой VPS: `npm run build && npm start` за nginx, PostgreSQL рядом, `STORAGE_DRIVER=local` с постоянным диском и бэкапами папки загрузок.
