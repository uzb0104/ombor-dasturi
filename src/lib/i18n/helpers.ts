/** To'lov turi */
export function paymentLabel(t: (key: string) => string, type: string): string {
  const map: Record<string, string> = {
    Naqd: t("payment.cash"),
    Karta: t("payment.card"),
    Qarz: t("payment.credit"),
  };
  return map[type] ?? type;
}

/** Lavozim */
export function roleLabel(t: (key: string) => string, role: string): string {
  const map: Record<string, string> = {
    Admin: t("role.admin"),
    Sotuvchi: t("role.seller"),
    Omborchi: t("role.warehouse"),
  };
  return map[role] ?? role;
}

/** Audit amal */
export function auditActionLabel(t: (key: string) => string, action: string): string {
  const map: Record<string, string> = {
    create: t("audit.act.create"),
    update: t("audit.act.update"),
    delete: t("audit.act.delete"),
    login: t("audit.act.login"),
    logout: t("audit.act.logout"),
  };
  return map[action] ?? action;
}
