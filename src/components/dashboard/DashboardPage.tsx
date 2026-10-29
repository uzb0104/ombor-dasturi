import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { StatCard, PageHeader } from "@/components/ui-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSom } from "@/lib/constants";
import {
  Wallet,
  TrendingUp,
  Calendar,
  CalendarDays,
  PiggyBank,
  AlertTriangle,
  Package,
} from "lucide-react";
import { useT, useLang } from "@/lib/i18n";
import { DashboardHeroBanner } from "./DashboardHeroBanner";
import { DashboardDetailDialog, type DetailKind } from "./DashboardDetailDialog";

export function DashboardPage() {
  const t = useT();
  const { lang } = useLang();
  const {
    products,
    sales,
    expenses,
    employees,
    customers,
    suppliers,
    usedBatteries = [],
    vehicleFilter,
    setVehicleFilter,
    vehicleBrands,
    usdRate,
    usdRateMode,
  } = useStore();
  const [detail, setDetail] = useState<DetailKind>(null);

  const filtered = useMemo(() => {
    if (vehicleFilter === "all") return { products, sales };
    const matchVehicle = (p: { vehicle?: string; vehicles?: string[] }) =>
      p.vehicle === vehicleFilter ||
      (p.vehicles && p.vehicles.includes(vehicleFilter)) ||
      (p.vehicle && p.vehicle.includes(vehicleFilter));

    const productIds = new Set(products.filter(matchVehicle).map((p) => p.id));
    return {
      products: products.filter(matchVehicle),
      sales: sales.filter((s) => s.items.some((i) => productIds.has(i.productId))),
    };
  }, [products, sales, vehicleFilter]);

  const warehouseValue = filtered.products.reduce(
    (a, p) => a + (p.buyPrice || 0) * (p.quantity || 0),
    0,
  );
  const totalProductsCount = filtered.products.length;
  const totalItemsQty = filtered.products.reduce((a, p) => a + (p.quantity || 0), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const sum = (arr: typeof filtered.sales) => arr.reduce((a, s) => a + (s.total || 0), 0);
  const sumProfit = (arr: typeof filtered.sales) => arr.reduce((a, s) => a + (s.profit || 0), 0);

  const todaySalesList = filtered.sales.filter((s) => new Date(s.date) >= today);
  const weekSalesList = filtered.sales.filter((s) => new Date(s.date) >= weekAgo);
  const monthSalesList = filtered.sales.filter((s) => new Date(s.date) >= monthAgo);

  const todaySales = sum(todaySalesList);
  const todayProfit = sumProfit(todaySalesList);
  const weekSales = sum(weekSalesList);
  const monthSales = sum(monthSalesList);
  const totalProfit = sumProfit(filtered.sales);
  const totalExpenses = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const netProfit = totalProfit - totalExpenses;

  // Faqat mijozlar qarzi (nasiyalar)
  const customerDebt = customers.reduce((a, c) => a + (c.debt || 0), 0);
  const debtCustomersCount = customers.filter((c) => (c.debt || 0) > 0).length;

  const lowStock = filtered.products
    .filter((p) => p.quantity > 0 && p.quantity <= p.minQty)
    .slice(0, 6);
  const outStock = filtered.products.filter((p) => p.quantity === 0).slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        showBack={false}
        title="Dashboard"
        subtitle={
          vehicleFilter === "all"
            ? t("dashboard.subtitleAll")
            : t("dashboard.subtitleFilter", { brand: vehicleFilter })
        }
        actions={
          vehicleBrands.length > 0 ? (
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("nav.all")}</SelectItem>
                {vehicleBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      <DashboardHeroBanner
        todaySales={todaySales}
        todaySalesCount={todaySalesList.length}
        todayProfit={todayProfit}
        monthSales={monthSales}
        netProfit={netProfit}
        warehouseValue={warehouseValue}
        totalProductsCount={totalProductsCount}
        totalItemsQty={totalItemsQty}
        customerDebt={customerDebt}
        debtCustomersCount={debtCustomersCount}
        usdRate={usdRate}
        usdRateMode={usdRateMode}
        lang={lang}
      />

      {/* Asosiy ko'rsatkichlar kartochkalari */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <StatCard
          label={t("dashboard.warehouseValue")}
          value={formatSom(warehouseValue)}
          hint={`${totalProductsCount} xil · ${totalItemsQty} dona`}
          icon={Package}
          accent="primary"
          onClick={() => setDetail("warehouse")}
        />
        <StatCard
          label={t("dashboard.todaySales")}
          value={formatSom(todaySales)}
          hint={`${todaySalesList.length} ta savdo`}
          icon={TrendingUp}
          accent="success"
          onClick={() => setDetail("today")}
        />
        <StatCard
          label={t("dashboard.weekSales")}
          value={formatSom(weekSales)}
          hint={`${weekSalesList.length} ta savdo`}
          icon={Calendar}
          accent="info"
          onClick={() => setDetail("week")}
        />
        <StatCard
          label={t("dashboard.monthSales")}
          value={formatSom(monthSales)}
          hint={`${monthSalesList.length} ta savdo`}
          icon={CalendarDays}
          accent="info"
          onClick={() => setDetail("month")}
        />
        <StatCard
          label={t("dashboard.grossProfit")}
          value={formatSom(totalProfit)}
          hint={`Sof foyda: ${formatSom(netProfit)}`}
          icon={PiggyBank}
          accent="success"
          onClick={() => setDetail("profit")}
        />
        <StatCard
          label={t("dashboard.debt")}
          value={formatSom(customerDebt)}
          hint={`${debtCustomersCount} ta mijoz qarzdor`}
          icon={customerDebt > 0 ? AlertTriangle : Wallet}
          accent={customerDebt > 0 ? "destructive" : "primary"}
          onClick={() => setDetail("debt")}
        />
      </div>

      {/* Kam qolgan yoki tugagan tovarlar ogohlantirishi */}
      {(lowStock.length > 0 || outStock.length > 0) && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning-foreground mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">{t("dashboard.stockAlert")}</div>
            <div className="text-muted-foreground mt-0.5">
              {t("dashboard.stockAlertDesc", { low: lowStock.length, out: outStock.length })}
            </div>
          </div>
        </div>
      )}

      {/* Batafsil ma'lumot modali */}
      <DashboardDetailDialog
        kind={detail}
        onClose={() => setDetail(null)}
        ctx={{
          products: filtered.products,
          sales: filtered.sales,
          expenses,
          employees,
          customers,
          suppliers,
          usedBatteries,
        }}
      />
    </div>
  );
}
