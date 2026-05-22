import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, theme, toggleTheme, resetData } = useStore();
  return (
    <div className="space-y-5 max-w-3xl">
      <PageHeader title="Sozlamalar" subtitle="Hisob va tizim sozlamalari" />

      <Card className="p-6 rounded-2xl space-y-4">
        <h3 className="font-semibold">Profil</h3>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Ism</Label><Input defaultValue={user?.name} /></div>
          <div><Label>Email</Label><Input defaultValue={user?.email} /></div>
          <div><Label>Lavozim</Label><Input defaultValue={user?.role} disabled /></div>
        </div>
        <Button onClick={() => toast.success("Saqlandi")}>Saqlash</Button>
      </Card>

      <Card className="p-6 rounded-2xl space-y-4">
        <h3 className="font-semibold">Ko'rinish</h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Qorong'i rejim</div>
            <div className="text-xs text-muted-foreground">Dark mode yoqish</div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
      </Card>

      <Card className="p-6 rounded-2xl space-y-3 border-destructive/30">
        <h3 className="font-semibold text-destructive">Xavfli zona</h3>
        <p className="text-sm text-muted-foreground">Barcha demo ma'lumotlarni dastlabki holatga qaytarish.</p>
        <Button variant="destructive" onClick={() => { resetData(); toast.success("Ma'lumotlar tiklandi"); }}>
          Demo ma'lumotlarni tiklash
        </Button>
      </Card>
    </div>
  );
}
