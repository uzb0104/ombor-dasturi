import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ScanBarcode, Search, Plus, Package, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/_app/barcode")({ component: BarcodePage });

function BarcodePage() {
  const t = useT();
  const { products, categories, vehicleBrands, addProduct, updateProduct } = useStore();
  const [code, setCode] = useState("");
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<string | null>(null);
  const [newBarcode, setNewBarcode] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  // Yangi tovar yaratish modal holatlari
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    barcode: "",
    category: categories[0] || "Umumiy",
    vehicle: vehicleBrands[0] || "Barchasi",
    buyPrice: 0,
    sellPrice: 0,
    quantity: 1,
    minQty: 5,
  });

  const found = useMemo(
    () =>
      products.find(
        (p) =>
          (p.barcode && p.barcode === code.toUpperCase()) ||
          p.name.toLowerCase() === code.toLowerCase(),
      ),
    [products, code],
  );
  const withoutBarcode = useMemo(() => products.filter((p) => !p.barcode), [products]);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  const handleScanKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const val = scanBuffer.trim().toUpperCase();
      if (!val) return;
      setLastScan(val);
      const hit = products.find((p) => p.barcode === val);
      if (hit) {
        toast.success(t("barcode.found", { name: hit.name }));
      } else {
        toast.error(`Shtrix-kod (${val}) bazadan topilmadi. Yangi tovar qo'shishingiz mumkin!`);
      }
      setScanBuffer("");
    }
  };

  const openQuickCreate = (barcodeToUse: string) => {
    setCreateForm({
      name: "",
      barcode: barcodeToUse,
      category: categories[0] || "Umumiy",
      vehicle: vehicleBrands[0] || "Barchasi",
      buyPrice: 0,
      sellPrice: 0,
      quantity: 1,
      minQty: 5,
    });
    setQuickCreateOpen(true);
  };

  const handleSaveQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error("Mahsulot nomini kiriting!");
      return;
    }

    const newProd: Product = {
      id: `prod_${Math.random().toString(36).slice(2, 9)}`,
      name: createForm.name.trim(),
      barcode: createForm.barcode.trim().toUpperCase() || undefined,
      category: createForm.category,
      vehicle: createForm.vehicle,
      buyPrice: Number(createForm.buyPrice) || 0,
      sellPrice: Number(createForm.sellPrice) || 0,
      quantity: Number(createForm.quantity) || 0,
      minQty: Number(createForm.minQty) || 5,
    };

    addProduct(newProd);
    toast.success(`"${newProd.name}" avtomatik Supabase bazasiga saqlandi!`);
    setQuickCreateOpen(false);
    if (lastScan === createForm.barcode) {
      setLastScan(createForm.barcode);
    }
  };

  const handleIncrementStock = (hit: Product) => {
    const nextQty = hit.quantity + 1;
    updateProduct(hit.id, { quantity: nextQty });
    toast.success(`"${hit.name}" zaxirasi +1 ga oshirildi (Jami: ${nextQty})`);
  };

  const generateBarcode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const len = 5 + Math.floor(Math.random() * 4);
    setNewBarcode(
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join(""),
    );
  };

  const assignBarcode = () => {
    const code = newBarcode.trim().toUpperCase();
    if (!assignFor || !code) {
      toast.error(t("barcode.enterCode"));
      return;
    }
    if (products.some((p) => p.barcode === code && p.id !== assignFor)) {
      toast.error(t("barcode.codeTaken"));
      return;
    }
    updateProduct(assignFor, { barcode: code });
    toast.success(t("barcode.linked"));
    setAssignFor(null);
    setNewBarcode("");
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t("barcode.title")} subtitle={t("barcode.subtitle")} />

      <Tabs defaultValue="scan">
        <TabsList>
          <TabsTrigger value="scan">{t("barcode.tab.scan")}</TabsTrigger>
          <TabsTrigger value="search">{t("barcode.tab.search")}</TabsTrigger>
          <TabsTrigger value="without">
            {t("barcode.tab.without", { n: withoutBarcode.length })}
          </TabsTrigger>
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
              <Button
                onClick={() =>
                  handleScanKey({ key: "Enter" } as React.KeyboardEvent<HTMLInputElement>)
                }
              >
                <ScanBarcode className="h-4 w-4 mr-1" />
                {t("common.check")}
              </Button>
            </div>
            {lastScan && (
              <div className="mt-5 p-5 rounded-2xl border bg-card">
                <div className="text-xs text-muted-foreground">
                  {t("barcode.lastScan")} <span className="font-mono font-bold text-foreground">{lastScan}</span>
                </div>
                {(() => {
                  const hit = products.find((p) => p.barcode === lastScan);
                  if (!hit)
                    return (
                      <div className="mt-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-5 w-5 shrink-0" />
                          <div>
                            <div className="font-semibold">Mahsulot topilmadi</div>
                            <div className="text-xs text-destructive/80">
                              Ushbu shtrix-kod ({lastScan}) bazada mavjud emas.
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openQuickCreate(lastScan)}
                          className="w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Bazaga tovar qo'shish
                        </Button>
                      </div>
                    );
                  return (
                    <div className="mt-3 p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <span className="font-bold text-lg">{hit.name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {hit.vehicle} · {hit.category} ·{" "}
                            {t("barcode.stockLeft", { n: hit.quantity })}
                          </div>
                          <div className="text-sm mt-2 flex gap-4">
                            <div>
                              Sotuv narxi: <span className="font-semibold text-primary">{formatSom(hit.sellPrice)}</span>
                            </div>
                            <div>
                              Kirim narxi: <span className="font-medium text-muted-foreground">{formatSom(hit.buyPrice)}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleIncrementStock(hit)}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          +1 zaxira qo'shish
                        </Button>
                      </div>
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
                <Input
                  className="pl-9 font-mono uppercase"
                  placeholder={t("barcode.searchPh")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>
            {code && found && (
              <div className="mt-5 p-5 rounded-xl border bg-muted/40 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-bold">{found.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {found.vehicle} · {found.category}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleIncrementStock(found)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    +1 zaxira
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div>
                    <div className="text-xs text-muted-foreground">{t("common.code")}</div>
                    <div className="font-mono text-sm">{found.barcode || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("products.qty")}</div>
                    <div className="font-semibold">{found.quantity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("products.buyPrice")}</div>
                    <div>{formatSom(found.buyPrice)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t("products.sellPrice")}</div>
                    <div className="font-semibold">{formatSom(found.sellPrice)}</div>
                  </div>
                </div>
              </div>
            )}
            {code && !found && (
              <div className="mt-5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-between">
                <span className="text-sm text-destructive">{t("barcode.notFoundShort")}.</span>
                <Button size="sm" onClick={() => openQuickCreate(code.toUpperCase())}>
                  <Plus className="h-4 w-4 mr-1" />
                  Yangi tovar yaratish
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="without" className="mt-4">
          <Card className="p-4 rounded-2xl">
            {withoutBarcode.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                {t("barcode.allLinked")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {withoutBarcode.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                    <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.vehicle} · {t("barcode.stockLeft", { n: p.quantity })}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAssignFor(p.id);
                        setNewBarcode("");
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t("barcode.codeBtn")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shtrix-kodga biriktirish modali */}
      <Dialog open={!!assignFor} onOpenChange={(v) => !v && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("barcode.assignTitle")}</DialogTitle>
          </DialogHeader>
          <Label>{t("barcode.codeLabel")}</Label>
          <div className="flex gap-2">
            <Input
              className="font-mono uppercase tracking-wider"
              value={newBarcode}
              onChange={(e) => setNewBarcode(e.target.value.toUpperCase())}
              placeholder={t("barcode.codePh")}
              autoFocus
            />
            <Button type="button" variant="outline" onClick={generateBarcode}>
              {t("common.generate")}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={assignBarcode}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skaner qilingan shtrix-kod bilan avtomatik yangi mahsulot yaratish modali */}
      <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-primary" />
              Yangi tovar qo'shish (Bazaga)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveQuickProduct} className="space-y-4">
            <div>
              <Label>Shtrix-kod</Label>
              <Input
                value={createForm.barcode}
                readOnly
                className="font-mono bg-muted text-foreground uppercase tracking-wider"
              />
            </div>

            <div>
              <Label>Mahsulot nomi *</Label>
              <Input
                required
                autoFocus
                placeholder="Masalan: Akkumulyator 60Ah"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategoriya</Label>
                <Select
                  value={createForm.category}
                  onValueChange={(v) => setCreateForm({ ...createForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Avto model</Label>
                <Select
                  value={createForm.vehicle}
                  onValueChange={(v) => setCreateForm({ ...createForm, vehicle: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleBrands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kirim narxi (so'm)</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.buyPrice || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, buyPrice: Number(e.target.value) })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Sotuv narxi (so'm)</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.sellPrice || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, sellPrice: Number(e.target.value) })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Boshlang'ich miqdor</Label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.quantity}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, quantity: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <Label>Minimal ogohlantirish soni</Label>
                <Input
                  type="number"
                  min="1"
                  value={createForm.minQty}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, minQty: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setQuickCreateOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-1" />
                Bazaga saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

