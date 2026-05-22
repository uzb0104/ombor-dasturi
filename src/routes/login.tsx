import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Car, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState("admin@autoerp.uz");
  const [password, setPassword] = useState("admin123");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const ok = login(email, password, remember);
      if (ok) {
        toast.success("Tizimga muvaffaqiyatli kirildi");
        navigate({ to: "/dashboard" });
      } else toast.error("Email yoki parol noto'g'ri");
      setLoading(false);
    }, 500);
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
            <div className="text-xs opacity-70">Avto ehtiyot qismlar boshqaruvi</div>
          </div>
        </div>
        <div className="space-y-4 max-w-md relative z-10">
          <h2 className="text-4xl font-bold leading-tight">Avtomobil biznesingiz uchun yagona platforma</h2>
          <p className="text-sm opacity-80">Omborxona, sotuvlar, mijozlar, qarzlar va hisobotlar — barchasi bir joyda. Tez, qulay va professional.</p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[["50+","Tovarlar"],["15+","Mijozlar"],["11","Brendlar"]].map(([n,l]) => (
              <div key={l} className="rounded-xl bg-sidebar-accent/30 p-3 border border-sidebar-border">
                <div className="text-2xl font-bold">{n}</div>
                <div className="text-xs opacity-70">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="text-xs opacity-50 relative z-10">© {new Date().getFullYear()} AutoERP Pro</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 card-elevated rounded-2xl">
          <div className="text-center mb-6">
            <div className="lg:hidden grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground mx-auto mb-3">
              <Car className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Xush kelibsiz</h1>
            <p className="text-sm text-muted-foreground mt-1">Hisobingizga kirish uchun ma'lumotlarni kiriting</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@autoerp.uz" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Parol</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                Meni eslab qol
              </label>
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => toast.info("Parolni tiklash xati yuborildi")}>
                Parolni unutdingizmi?
              </button>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirish"}
            </Button>
            <div className="text-xs text-muted-foreground text-center pt-2">
              Demo: <span className="font-mono">admin@autoerp.uz</span> · har qanday parol
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
