/** Russian labels for the admin panel (staff UI is Russian-only in the MVP). */
export const STATUS_RU: Record<string, string> = {
  draft: "Черновик",
  pending: "На модерации",
  active: "Активно",
  rejected: "Отклонено",
  archived: "Архив",
  sold: "Продано",
  blocked: "Заблокировано",
};

export const ROLE_RU: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Администратор",
  moderator: "Модератор",
  support: "Поддержка",
  seller: "Продавец",
  user: "Пользователь",
};

export const PAID_RU: Record<string, string> = {
  pending_payment: "Ожидает оплаты",
  active: "Активно",
  expired: "Истекло",
  cancelled: "Отменено",
};

export const REPORT_REASON_RU: Record<string, string> = {
  fraud: "Мошенничество",
  prohibited: "Запрещённый товар",
  wrong_category: "Неверная категория",
  wrong_price: "Неверная цена",
  duplicate: "Дубликат",
  offensive: "Оскорбительное",
  sold: "Уже продано",
  fake_contacts: "Неверные контакты",
  other: "Другое",
};

export const statusTone = (s: string) =>
  s === "active" ? "success" : s === "pending" || s === "pending_payment" ? "warn" : s === "rejected" || s === "blocked" ? "danger" : "neutral";
