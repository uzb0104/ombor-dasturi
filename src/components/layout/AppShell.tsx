import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Warehouse as WarehouseIcon, Package, Tags, ShoppingCart, PackagePlus,
  Users, Truck, Wallet, UserCog, Receipt, BarChart3, ScanBarcode, Settings,
  Bell, Search, Sun, Moon, LogOut, ChevronDown, Menu, Car, X,
} from "lucide-react";
import { NAV, WAREHOUSES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

const ICONS = {
  LayoutDashboard, Warehouse: WarehouseIcon, Package, Tags, ShoppingCart, PackagePlus,
  Users, Truck, Wallet, UserCog, Receipt, BarChart3, ScanBarcode, Settings,
} as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, logout, theme, toggleTheme, warehouse, setWarehouse, vehicleFilter, setVehicleFilter } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(new Date());

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
        <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">Menyu</div>
        {NAV.filter((item) => {
          if (!user) return true;
          if (user.role === "Admin") return true;
          if (item.to === "/settings") return true; // profile/security tabs visible to all
          const perms = user.permissions || [];
          return perms.includes(item.to);
        }).map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS];
          const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 my-0.5 text-sm transition ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/40"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <div className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider opacity-50">Avtomobil brendi</div>
        <div className="px-2">
          <Select value={vehicleFilter} onValueChange={(v) => setVehicleFilter(v as any)}>
            <SelectTrigger className="w-full bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              {VEHICLE_BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
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

          <div className="relative hidden md:block w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Qidirish..." className="pl-9 bg-muted/40 border-transparent focus-visible:bg-background" />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:block text-xs text-muted-foreground tabular-nums px-2">
              {now.toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" })}
            </div>

            <Select value={warehouse} onValueChange={(v) => setWarehouse(v as any)}>
              <SelectTrigger className="hidden sm:flex h-9 w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WAREHOUSES.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-destructive-foreground">3</Badge>
            </Button>

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
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Sozlamalar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); navigate({ to: "/login" }); }}>
                  <LogOut className="h-4 w-4 mr-2" /> Chiqish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-[1600px] p-4 md:p-6 animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
