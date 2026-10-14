import { useState } from "react";
import { ShoppingBag, History, Sparkles, Layers } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { SalesPosView } from "./SalesPosView";
import { SalesHistoryView } from "./SalesHistoryView";

export function SalesPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");
  const { sales } = useStore();

  const todaySalesCount = sales.filter((s) => {
    const saleDate = new Date(s.date).toDateString();
    return saleDate === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Page Header with Tabs Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Sotuvlar & Kassa (POS)</span>
            <Badge
              variant="outline"
              className="text-xs bg-primary/5 text-primary border-primary/20"
            >
              POS v2.0
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tezkor kassa savdosi, savat tizimi, chek chop etish va sotuvlar tahlili
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/80">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "pos"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span>Kassa / POS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4 text-emerald-500" />
            <span>Sotuvlar tarixi</span>
            {todaySalesCount > 0 && (
              <Badge className="h-4 px-1 text-[9px] font-bold bg-primary/20 text-primary hover:bg-primary/20 border-0">
                +{todaySalesCount}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Main Content View */}
      {activeTab === "pos" ? <SalesPosView /> : <SalesHistoryView />}
    </div>
  );
}
