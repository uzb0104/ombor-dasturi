import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatSom, formatDate } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { paymentLabel } from "@/lib/i18n/helpers";
import type { useStore } from "@/lib/store";

export type DetailKind =
  | "warehouse"
  | "today"
  | "week"
  | "month"
  | "profit"
  | "expenses"
  | "salary"
  | "net"
  | "debt"
  | "battery"
  | null;

export interface DashboardDetailDialogProps {
  kind: DetailKind;
  onClose: () => void;
  ctx: {
    products: ReturnType<typeof useStore.getState>["products"];
    sales: ReturnType<typeof useStore.getState>["sales"];
    expenses: ReturnType<typeof useStore.getState>["expenses"];
    employees: ReturnType<typeof useStore.getState>["employees"];
    customers: ReturnType<typeof useStore.getState>["customers"];
    suppliers: ReturnType<typeof useStore.getState>["suppliers"];
    usedBatteries?: ReturnType<typeof useStore.getState>["usedBatteries"];
  };
}

export function DashboardDetailDialog({ kind, onClose, ctx }: DashboardDetailDialogProps) {
  const t = useT();
  if (!kind) return null;

  const titles: Record<Exclude<DetailKind, null>, string> = {
    warehouse: t("dashboard.detail.warehouse"),
    today: t("dashboard.detail.today"),
    week: t("dashboard.detail.week"),
    month: t("dashboard.detail.month"),
    profit: t("dashboard.detail.profit"),
    expenses: t("dashboard.detail.expenses"),
    salary: t("dashboard.detail.salary"),
    net: t("dashboard.detail.net"),
    debt: t("dashboard.detail.debt"),
    battery: "Eski Akkumulyatorlar (Lom) Balansi",
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const filterSales = (from?: Date) =>
    ctx.sales
      .filter((s) => !from || new Date(s.date) >= from)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[kind]}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {kind === "warehouse" && (
            <List
              rows={[...ctx.products]
                .sort((a, b) => b.buyPrice * b.quantity - a.buyPrice * a.quantity)
                .map((p) => ({
                  key: p.id,
                  title: p.name,
                  sub: `${p.vehicle} · ${p.quantity} ${t("common.pcsUnit")} × ${formatSom(p.buyPrice)}`,
                  amount: formatSom(p.buyPrice * p.quantity),
                }))}
            />
          )}
          {(kind === "today" || kind === "week" || kind === "month") && (
            <SaleList
              sales={filterSales(kind === "today" ? now : kind === "week" ? weekAgo : monthAgo)}
              customers={ctx.customers}
              field="total"
              sign="+"
            />
          )}
          {kind === "profit" && (
            <SaleList sales={filterSales()} customers={ctx.customers} field="profit" sign="+" />
          )}
          {kind === "expenses" && (
            <List
              rows={[...ctx.expenses]
                .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                .map((e) => ({
                  key: e.id,
                  title: e.category,
                  sub: `${formatDate(e.date)} · ${e.note || "—"}`,
                  amount: `−${formatSom(e.amount)}`,
                  tone: "destructive" as const,
                }))}
            />
          )}
          {kind === "salary" && (
            <List
              rows={ctx.employees
                .filter((e) => e.status === "Faol")
                .map((e) => ({
                  key: e.id,
                  title: e.name,
                  sub: e.role,
                  amount: formatSom(e.salary),
                }))}
            />
          )}
          {kind === "net" && (
            <>
              <div className="font-semibold text-success">{t("dashboard.profitSection")}</div>
              <SaleList sales={filterSales()} customers={ctx.customers} field="profit" sign="+" />
              <div className="font-semibold text-destructive pt-2">{t("dashboard.expenses")}</div>
              <List
                rows={[...ctx.expenses]
                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                  .map((e) => ({
                    key: e.id,
                    title: e.category,
                    sub: formatDate(e.date),
                    amount: `−${formatSom(e.amount)}`,
                    tone: "destructive" as const,
                  }))}
              />
            </>
          )}
          {kind === "debt" && (
            <>
              <div className="font-semibold text-rose-500">{t("dashboard.customerDebt")}</div>
              <List
                rows={ctx.customers
                  .filter((c) => c.debt > 0)
                  .sort((a, b) => b.debt - a.debt)
                  .map((c) => ({
                    key: c.id,
                    title: c.name,
                    sub: `${c.phone || "Telefon yo'q"} · ${c.address || ""}`,
                    amount: formatSom(c.debt),
                    tone: "destructive" as const,
                  }))}
              />
            </>
          )}
          {kind === "battery" && (
            <List
              rows={[...(ctx.usedBatteries || [])]
                .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                .map((b) => ({
                  key: b.id,
                  title:
                    b.type === "kirim"
                      ? `Kirim: ${b.customerName || "Mijoz"}`
                      : `Chiqim: ${b.factoryName || "Zavod"}`,
                  sub: `${formatDate(b.date)} · ${b.weightKg} kg (${b.batteryType || "Standart"})`,
                  amount: `${b.type === "kirim" ? "+" : "−"}${formatSom(b.totalAmount)}`,
                  tone: b.type === "kirim" ? ("success" as const) : ("destructive" as const),
                }))}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function List({
  rows,
}: {
  rows: {
    key: string;
    title: string;
    sub: string;
    amount: string;
    tone?: "destructive" | "success";
  }[];
}) {
  const t = useT();
  if (rows.length === 0)
    return <div className="text-muted-foreground text-center py-4">{t("audit.notFound")}</div>;
  return (
    <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{r.title}</div>
            <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
          </div>
          <div
            className={`tabular-nums font-semibold whitespace-nowrap ml-2 ${r.tone === "destructive" ? "text-destructive" : r.tone === "success" ? "text-success" : ""}`}
          >
            {r.amount}
          </div>
        </div>
      ))}
    </div>
  );
}

function SaleList({
  sales,
  customers,
  field,
  sign,
}: {
  sales: ReturnType<typeof useStore.getState>["sales"];
  customers: ReturnType<typeof useStore.getState>["customers"];
  field: "total" | "profit";
  sign: "+" | "−";
}) {
  const t = useT();
  return (
    <List
      rows={sales.map((s) => {
        const cust = customers.find((c) => c.id === s.customerId);
        return {
          key: s.id,
          title: cust?.name || t("sales.customer"),
          sub: `${formatDate(s.date)} · ${paymentLabel(t, s.paymentType)} · ${s.items.length} ${t("common.itemsUnit")}`,
          amount: `${sign}${formatSom(s[field])}`,
          tone: "success" as const,
        };
      })}
    />
  );
}
