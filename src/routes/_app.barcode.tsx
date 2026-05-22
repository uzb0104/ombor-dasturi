import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ScanBarcode, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/barcode")({ component: BarcodePage });

function BarcodePage() {
  const products = useStore(s => s.products);
  const [code, setCode] = useState("");
  const found = products.find(p => p.barcode === code || p.sku === code);

  return (
    <div className="space-y-5">
      <PageHeader title="Barkod" subtitle="Barkod orqali tovar qidirish va generatsiya" />
      <Card className="p-6 rounded-2xl">
        <div className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 font-mono" placeholder="Barkod yoki SKU kiriting..." value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <Button onClick={() => found ? toast.success(`Topildi: ${found.name}`) : toast.error("Topilmadi")}>
            <ScanBarcode className="h-4 w-4 mr-1" />Skanerlash
          </Button>
        </div>

        {found && (
          <div className="mt-6 p-5 rounded-xl border bg-muted/40 animate-fade-in">
            <div className="text-xl font-bold">{found.name}</div>
            <div className="text-sm text-muted-foreground mt-1">{found.vehicle} · {found.category}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div><div className="text-xs text-muted-foreground">SKU</div><div className="font-mono">{found.sku}</div></div>
              <div><div className="text-xs text-muted-foreground">Miqdor</div><div className="font-semibold">{found.quantity}</div></div>
              <div><div className="text-xs text-muted-foreground">Sotib olish</div><div>{formatSom(found.buyPrice)}</div></div>
              <div><div className="text-xs text-muted-foreground">Sotuv</div><div className="font-semibold">{formatSom(found.sellPrice)}</div></div>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 rounded-2xl">
        <h3 className="font-semibold mb-3">Barkod generatori (namuna)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.slice(0, 8).map(p => (
            <div key={p.id} className="rounded-lg border p-3 text-center">
              <div className="font-mono text-[10px] tracking-[0.2em] py-3 bg-foreground text-background rounded">||| | |||| | || |||</div>
              <div className="text-xs font-mono mt-1">{p.barcode}</div>
              <div className="text-xs font-medium truncate mt-1">{p.name}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
