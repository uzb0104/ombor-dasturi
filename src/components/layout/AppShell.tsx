import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Warehouse as WarehouseIcon, Package, Tags, ShoppingCart, PackagePlus,
  Users, Truck, Wallet, UserCog, Receipt, BarChart3, ScanBarcode, Settings, FileClock,
  Bell, Search, Sun, Moon, LogOut, ChevronDown, Menu, Car, X, Smartphone,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { NAV } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useEffect, useState } from "react";
import { useLang, LANG_LABELS, UI_LANGS, type Lang } from "@/lib/i18n";
import { Languages } from "lucide-react";

const ICONS = {
  LayoutDashboard, Warehouse: WarehouseIcon, Package, Tags, ShoppingCart, PackagePlus,
  Users, Truck, Wallet, UserCog, Receipt, BarChart3, ScanBarcode, Settings, FileClock, Smartphone,
} as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const t = useT();
  const { user, logout, theme, toggleTheme, warehouse, setWarehouse, vehicleFilter, setVehicleFilter, vehicleBrands, branches, products, customers } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [now, setNow] = useState(new Date());

  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minQty);
  const outStock = products.filter(p => p.quantity === 0);
  const totalNotifications = lowStock.length + outStock.length;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Car className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-bold tracking-tight">AutoERP Pro</div>
          <div className="text-[10px] uppercase tracking-wider opacity-60">Avto ehtiyot qismlar</div>
        </div>
        <button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">{t("nav.menu")}</div>
        {NAV.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS];
          const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 my-0.5 text-sm transition ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/40"
              } ${item.to === "/pos" ? "ring-1 ring-primary/40" : ""}`}
            >
              <Icon className="h-4 w-4" />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
        <div className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">{t("nav.vehicleBrand")}</div>
        <div className="px-2">
          <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v as any)}>
            <SelectTrigger className="w-full bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("nav.all")}</SelectItem>
              {vehicleBrands.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </nav>
      <div className="border-t border-sidebar-border p-3 text-xs opacity-70">
        © {new Date().getFullYear()} AutoERP Pro
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="hidden md:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b bg-card/80 backdrop-blur px-4 py-3">
          <button className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>

          <div className="relative hidden md:block w-72" onClick={() => setSearchOpen(true)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input readOnly placeholder={t("nav.search")} className="pl-9 bg-muted/40 border-transparent cursor-pointer hover:bg-muted/60 focus-visible:bg-background" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:block text-xs text-muted-foreground tabular-nums px-2">
              {now.toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" })}
            </div>

            <Select value={warehouse} onValueChange={(v) => setWarehouse(v as any)}>
              <SelectTrigger className="hidden sm:flex h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {branches.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>

            <LangSwitcher />

            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {totalNotifications > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">
                      {totalNotifications}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>{t("nav.notifications")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {totalNotifications === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t("nav.noNotifications")}</div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {outStock.slice(0, 5).map(p => (
                      <DropdownMenuItem key={`out-${p.id}`} onClick={() => navigate({ to: "/products" })} className="cursor-pointer">
                        <div className="flex flex-col gap-1 w-full">
                          <span className="font-medium text-destructive">{t("nav.outOfStock")}</span>
                          <span className="text-xs text-muted-foreground">{p.name} ({p.vehicle})</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    {lowStock.slice(0, 5).map(p => (
                      <DropdownMenuItem key={`low-${p.id}`} onClick={() => navigate({ to: "/products" })} className="cursor-pointer">
                        <div className="flex flex-col gap-1 w-full">
                          <span className="font-medium text-warning-foreground">{t("nav.lowStock")}: {p.quantity} ta</span>
                          <span className="text-xs text-muted-foreground">{p.name} ({p.vehicle})</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user?.name?.slice(0,2).toUpperCase() || "AU"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start leading-tight">
                    <span className="text-xs font-medium">{user?.name}</span>
                    <span className="text-[10px] text-muted-foreground">{user?.role}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>{t("nav.settings")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); navigate({ to: "/login" }); }}>
                  <LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-[1600px] p-4 md:p-6 animate-fade-in">{children}</div>
        </main>
      </div>
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder={t("nav.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("nav.searchEmpty")}</CommandEmpty>
          <CommandGroup heading={t("nav.pages")}>
            {NAV.map((item) => {
              const Icon = ICONS[item.icon as keyof typeof ICONS];
              return (
                <CommandItem key={item.to} onSelect={() => { navigate({ to: item.to }); setSearchOpen(false); }} className="cursor-pointer">
                  <Icon className="mr-2 h-4 w-4" />
                  {t(item.labelKey)}
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading={t("nav.productsTop")}>
            {products.slice(0, 10).map(p => (
              <CommandItem key={p.id} onSelect={() => { navigate({ to: "/products" }); setSearchOpen(false); }} className="cursor-pointer">
                <Package className="mr-2 h-4 w-4" />
                {p.name} ({p.vehicle}) - {p.quantity} {t("nav.pcs")}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t("nav.customersTop")}>
            {customers.slice(0, 5).map(c => (
              <CommandItem key={c.id} onSelect={() => { navigate({ to: "/customers" }); setSearchOpen(false); }} className="cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                {c.name} - {c.phone}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function LangSwitcher() {
  const { lang, setLang } = useLang();
  const current = lang === "uz_cyr" ? "uz" : lang;
  return (
    <Select value={current} onValueChange={(v) => setLang(v as Lang)}>
      <SelectTrigger className="h-9 w-auto gap-1 px-2" aria-label="Til">
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">{LANG_LABELS[current as keyof typeof LANG_LABELS]}</span>
      </SelectTrigger>
      <SelectContent align="end">
        {UI_LANGS.map((l) => (
          <SelectItem key={l} value={l}>{LANG_LABELS[l]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
