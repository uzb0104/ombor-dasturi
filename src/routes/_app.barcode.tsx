import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ScanBarcode, Search, Plus, Package } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app/barcode")({ component: BarcodePage });

function BarcodePage() {
  const t = useT();
  const { products, updateProduct } = useStore();
  const [code, setCode] = useState("");
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [newBarcode, setNewBarcode] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  const found = useMemo(
    () => products.find(p => (p.barcode && p.barcode === code.toUpperCase()) || p.name.toLowerCase() === code.toLowerCase()),
    [products, code],
  );
  const withoutBarcode = useMemo(() => products.filter(p => !p.barcode), [products]);

  useEffect(() => { scanRef.current?.focus(); }, []);

  const handleScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = scanBuffer.trim().toUpperCase();
      if (!val) return;
      setLastScan(val);
      const hit = products.find(p => p.barcode === val);
      if (hit) toast.success(t("barcode.found", { name: hit.name }));
      else toast.error(t("barcode.notFound"));
      setScanBuffer("");
    }
  };

  const generateBarcode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const len = 5 + Math.floor(Math.random() * 4);
    setNewBarcode(Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  };

  const assignBarcode = () => {
    const code = newBarcode.trim().toUpperCase();
    if (!assignFor || !code) { toast.error(t("barcode.enterCode")); return; }
    if (products.some(p => p.barcode === code && p.id !== assignFor)) {
      toast.error(t("barcode.codeTaken")); return;
    }
    updateProduct(assignFor, { barcode: code });
    toast.success(t("barcode.linked"));
    setAssignFor(null); setNewBarcode("");
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t("barcode.title")} subtitle={t("barcode.subtitle")} />

      <Tabs defaultValue="scan">
        <TabsList>
          <TabsTrigger value="scan">{t("barcode.tab.scan")}</TabsTrigger>
          <TabsTrigger value="search">{t("barcode.tab.search")}</TabsTrigger>
          <TabsTrigger value="without">{t("barcode.tab.without", { n: withoutBarcode.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4">
          <Card className="p-6 rounded-2xl">
            <Label>{t("barcode.scanField")}</Label>
            <p className="text-xs text-muted-foreground mb-2">{t("barcode.scanHint")}</p>
            <div className="flex gap-2 max-w-xl">
              <Input
                ref={scanRef}
                autoFocus
                className="font-mono uppercase tracking-wider"
                placeholder={t("barcode.scanPh")}
                value={scanBuffer}
                onChange={(e) => setScanBuffer(e.target.value.toUpperCase())}
                onKeyDown={handleScanKey}
              />
              <Button onClick={() => handleScanKey({ key: "Enter" } as any)}>
                <ScanBarcode className="h-4 w-4 mr-1" />{t("common.check")}
              </Button>
            </div>
            {lastScan && (
              <div className="mt-5 p-4 rounded-xl border bg-muted/40">
                <div className="text-xs text-muted-foreground">{t("barcode.lastScan")} <span className="font-mono">{lastScan}</span></div>
                {(() => {
                  const hit = products.find(p => p.barcode === lastScan);
                  if (!hit) return <div className="mt-2 text-destructive font-medium">{t("barcode.notFoundShort")}</div>;
                  return (
                    <div className="mt-2">
                      <div className="font-semibold">{hit.name}</div>
                      <div className="text-sm text-muted-foreground">{hit.vehicle} · {hit.category} · {t("barcode.stockLeft", { n: hit.quantity })}</div>
                      <div className="text-sm mt-1">{t("products.sellPrice")}: <span className="font-semibold">{formatSom(hit.sellPrice)}</span></div>
                    </div>
                  );
                })()}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <Card className="p-6 rounded-2xl">
            <Label>{t("barcode.manualSearch")}</Label>
            <div className="flex gap-2 max-w-xl mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 font-mono uppercase" placeholder={t("barcode.searchPh")} value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
            </div>
            {code && found && (
              <div className="mt-5 p-5 rounded-xl border bg-muted/40 animate-fade-in">
                <div className="text-xl font-bold">{found.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{found.vehicle} · {found.category}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div><div className="text-xs text-muted-foreground">{t("common.code")}</div><div className="font-mono text-sm">{found.barcode || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t("products.qty")}</div><div className="font-semibold">{found.quantity}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t("products.buyPrice")}</div><div>{formatSom(found.buyPrice)}</div></div>
                  <div><div className="text-xs text-muted-foreground">{t("products.sellPrice")}</div><div className="font-semibold">{formatSom(found.sellPrice)}</div></div>
                </div>
              </div>
            )}
            {code && !found && <div className="mt-4 text-sm text-muted-foreground">{t("barcode.notFoundShort")}.</div>}
          </Card>
        </TabsContent>

        <TabsContent value="without" className="mt-4">
          <Card className="p-4 rounded-2xl">
            {withoutBarcode.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">{t("barcode.allLinked")}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {withoutBarcode.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                    <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.vehicle} · {t("barcode.stockLeft", { n: p.quantity })}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setAssignFor(p.id); setNewBarcode(""); }}>
                      <Plus className="h-3 w-3 mr-1" />{t("barcode.codeBtn")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!assignFor} onOpenChange={(v) => !v && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("barcode.assignTitle")}</DialogTitle></DialogHeader>
          <Label>{t("barcode.codeLabel")}</Label>
          <div className="flex gap-2">
            <Input className="font-mono uppercase tracking-wider" value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value.toUpperCase())}
              placeholder={t("barcode.codePh")} autoFocus />
            <Button type="button" variant="outline" onClick={generateBarcode}>{t("common.generate")}</Button>
          </div>
          <DialogFooter><Button onClick={assignBarcode}>{t("common.save")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
