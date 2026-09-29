import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Car, Loader2, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { apiGetPublicStats } from "@/lib/api";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    products: "50+",
    customers: "15+",
    vehicleBrands: "11",
  });

  useEffect(() => {
    apiGetPublicStats()
      .then((data) => {
        setStats({
          products: String(data.products),
          customers: String(data.customers),
          vehicleBrands: String(data.vehicleBrands),
        });
      })
      .catch(() => {});
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const ok = await login(email, password, remember);
      if (ok) {
        toast.success(t("login.success"));
        navigate({ to: "/dashboard" });
      } else toast.error(t("login.fail"));
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : undefined;
      const message =
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: string }).message)
          : "";

      if (!status || message.includes("fetch")) {
        toast.error("Server yuklanmoqda. Iltimos, 10-15 soniya kutib qayta urinib ko'ring.", {
          duration: 6000,
        });
      } else {
        toast.error(t("login.serverError"));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-sidebar text-sidebar-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-bold">AutoERP Pro</div>
            <div className="text-xs opacity-70">{t("login.brandSubtitle")}</div>
          </div>
        </div>
        <div className="space-y-4 max-w-md relative z-10">
          <h2 className="text-4xl font-bold leading-tight">{t("login.tagline")}</h2>
          <p className="text-sm opacity-80">{t("login.taglineDesc")}</p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              [stats.products, t("nav.products")],
              [stats.customers, t("nav.customers")],
              [stats.vehicleBrands, t("nav.vehicleBrand")],
            ].map(([n, l]) => (
              <div
                key={l}
                className="rounded-xl bg-sidebar-accent/30 p-3 border border-sidebar-border"
              >
                <div className="text-2xl font-bold">{n}</div>
                <div className="text-xs opacity-70">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="text-xs opacity-50 relative z-10">
          © {new Date().getFullYear()} AutoERP Pro
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 card-elevated rounded-2xl">
          <div className="text-center mb-6">
            <div className="lg:hidden grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground mx-auto mb-3">
              <Car className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("login.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("login.subtitle")}</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email yoki Login</Label>
              <Input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@autoerp.uz yoki login"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                {t("login.remember")}
              </label>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.submit")}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
