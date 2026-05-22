import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit";
import { CATEGORIES, VEHICLE_BRANDS } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Cog, Disc, Zap, CircleDot, BatteryCharging, Filter, Droplet, Car, Wrench } from "lucide-react";

const ICONS: Record<string, any> = {
  "Dvigatel": Cog, "Tormoz tizimi": Disc, "Elektr": Zap, "Shinalar": CircleDot,
  "Akkumulyator": BatteryCharging, "Filtrlar": Filter, "Moy": Droplet, "Kuzov qismlari": Car, "Podveska": Wrench,
};

export const Route = createFileRoute("/_app/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const products = useStore(s => s.products);
  return (
    <div className="space-y-5">
      <PageHeader title="Kategoriyalar" subtitle="Avtomobil ehtiyot qismlari turlari" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CATEGORIES.map(c => {
          const Icon = ICONS[c] || Cog;
          const count = products.filter(p => p.category === c).length;
          return (
            <Card key={c} className="p-5 rounded-2xl hover:shadow-elevated transition cursor-pointer">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{c}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{count} ta tovar</div>
              <div className="flex flex-wrap gap-1 mt-3">
                {VEHICLE_BRANDS.slice(0, 4).map(b => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
