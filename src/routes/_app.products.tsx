import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { useMemo, useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, ScanBarcode, Download } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";
import { exportToExcel, exportToPDF } from "@/lib/export";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type FormState = {
  name: string; barcode: string;
  vehicle: string; category: string;
  supplierId: string; buyPrice: number; sellPrice: number; quantity: number; minQty: number;
};

const emptyForm = (firstCategory: string, firstBrand: string): FormState => ({
  name: "", barcode: "",
  vehicle: firstBrand,
  category: firstCategory,
  supplierId: "", buyPrice: 0, sellPrice: 0, quantity: 0, minQty: 5,
});

function ProductsPage() {
  const { products, suppliers, categories, vehicleBrands, addProduct, updateProduct, deleteProduct, vehicleFilter } = useStore();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [veh, setVeh] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(categories[0] || "", vehicleBrands[0] || ""));

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 10;

  // Qidiruv va filtrlash
  const filtered = useMemo(() => products.filter(p => {
    const s = search.toLowerCase();
    if (search && !p.name.toLowerCase().includes(s) && !(p.barcode || "").includes(search)) return false;
    if (cat !== "all" && p.category !== cat) return false;
    const v = veh !== "all" ? veh : vehicleFilter !== "all" ? vehicleFilter : null;
    if (v && p.vehicle !== v) return false;
    return true;
  }), [products, search, cat, veh, vehicleFilter]);

  // Filtr o'zgarganda sahifani birinchisiga qaytaramiz
  useEffect(() => {
    setPage(1);
  }, [search, cat, veh, vehicleFilter]);

  const totalCount = filtered.length;
  const totalPages = Math.ceil(totalCount / limit);

  // Faqat joriy sahifadagi mahsulotlar
  const paginatedProducts = useMemo(() => {
    const from = (page - 1) * limit;
    const to = from + limit;
    return filtered.slice(from, to);
  }, [filtered, page, limit]);

  const startEdit = (id: string) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    setEditing(id);
    setForm({
      name: p.name, barcode: p.barcode || "",
      vehicle: p.vehicle, category: p.category,
      supplierId: p.supplierId, buyPrice: p.buyPrice, sellPrice: p.sellPrice,
      quantity: p.quantity, minQty: p.minQty,
    });
    setOpen(true);
  };

  const generateBarcode = () => {
    let code = "";
    do {
      code = `486${Math.floor(100000000 + Math.random() * 899999999)}`;
    } while (products.some(p => p.barcode === code));
    setForm(f => ({ ...f, barcode: code }));
    toast.success("Barkod yaratildi");
  };

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Tovar nomi majburiy"); return; }
    const bc = form.barcode.trim();
    if (bc) {
      const dup = products.find(p => p.barcode === bc && p.id !== editing);
      if (dup) { toast.error(`Bu barkod allaqachon mavjud: ${dup.name}`); return; }
    }
    try {
      if (editing) {
        await updateProduct(editing, { ...form, barcode: bc, sku: "" });
        toast.success("Tovar yangilandi");
      } else {
        await addProduct({
          id: `prd_${Math.random().toString(36).slice(2, 9)}`,
          sku: "",
          ...form,
          barcode: bc,
          supplierId: form.supplierId || suppliers[0]?.id || "",
        });
        toast.success("Tovar qo'shildi");
      }
      setOpen(false); setEditing(null); setForm(emptyForm(categories[0] || "", vehicleBrands[0] || ""));
    } catch (err: any) {
      toast.error(err.message || "Xatolik yuz berdi");
    }
  };

  // Excel eksport
  const handleExportExcel = () => {
    const dataToExport = filtered.map(p => ({
      "Nomi": p.name,
      "Barkod": p.barcode || "—",
      "Brend": p.vehicle,
      "Kategoriya": p.category,
      "Miqdor (dona)": p.quantity,
      "Sotib olish (UZS)": p.buyPrice,
      "Sotish (UZS)": p.sellPrice,
      "Kam miqdor": p.minQty
    }));
    exportToExcel(dataToExport, "mahsulotlar_ro'yxati");
    toast.success("Excel fayli yuklandi");
  };

  // PDF eksport
  const handleExportPDF = () => {
    const headers = ["Nomi", "Barkod", "Brend", "Kategoriya", "Miqdor", "Sotish"];
    const rows = filtered.map(p => [
      p.name,
      p.barcode || "—",
      p.vehicle,
      p.category,
      p.quantity.toString(),
      p.sellPrice.toLocaleString() + " UZS"
    ]);
    exportToPDF(headers, rows, "Mahsulotlar Ro'yxati Hisoboti", "mahsulotlar_ro'yxati");
    toast.success("PDF hisoboti yuklandi");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tovarlar"
        subtitle={`Jami ${products.length} ta tovar`}
        actions={
          <>
            <Button variant="outline" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
            <Button variant="outline" onClick={handleExportPDF}><Download className="h-4 w-4 mr-1" />PDF</Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm(categories[0] || "", vehicleBrands[0] || "")); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" />Yangi tovar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? "Tovarni tahrirlash" : "Yangi tovar"}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2"><Label>Nomi *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Tormoz kolodkasi" /></div>
                  <div className="sm:col-span-2">
                    <Label>Barkod (ixtiyoriy)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={form.barcode}
                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                        placeholder="Skanerlang yoki qo'lda kiriting"
                        className="font-mono"
                        autoFocus={!editing}
                      />
                      <Button type="button" variant="outline" onClick={generateBarcode}>
                        <ScanBarcode className="h-4 w-4 mr-1" />Yaratish
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">USB/HID skaner avtomatik kiritadi. Bo'sh qoldirilsa, tovar barkodsiz saqlanadi.</p>
                  </div>
                  <div><Label>Brend</Label>
                    <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{vehicleBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Kategoriya</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2"><Label>Yetkazib beruvchi</Label>
                    <Select value={form.supplierId || suppliers[0]?.id} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Miqdor</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: +e.target.value })} /></div>
                  <div><Label>Min. miqdor</Label><Input type="number" value={form.minQty} onChange={(e) => setForm({ ...form, minQty: +e.target.value })} /></div>
                  <div><Label>Sotib olish narxi</Label><Input type="number" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: +e.target.value })} /></div>
                  <div><Label>Sotuv narxi</Label><Input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={submit}>Saqlash</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Card className="p-3 md:p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom yoki barkod..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={veh} onValueChange={setVeh}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder="Brend" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Barcha brendlar</SelectItem>{vehicleBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder="Kategoriya" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Barcha kategoriyalar</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto -mx-3 md:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell"></TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead className="hidden md:table-cell">Barkod</TableHead>
                <TableHead className="hidden sm:table-cell">Brend</TableHead>
                <TableHead className="hidden lg:table-cell">Kategoriya</TableHead>
                <TableHead className="text-right">Miqdor</TableHead>
                <TableHead className="hidden md:table-cell text-right">Sotib olish</TableHead>
                <TableHead className="text-right">Sotuv</TableHead>
                <TableHead className="hidden sm:table-cell">Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Tovarlar topilmadi</TableCell></TableRow>
              )}
              {paginatedProducts.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell className="hidden sm:table-cell">
                    <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.name}
                    <div className="sm:hidden text-xs text-muted-foreground mt-0.5">{p.vehicle} · {p.category}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono text-muted-foreground">
                    {p.barcode ? p.barcode : <span className="italic text-gray-400">barkodsiz</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{p.vehicle}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{p.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-sm">{formatSom(p.buyPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">{formatSom(p.sellPrice)}</TableCell>
                  <TableCell className="hidden sm:table-cell"><StatusBadge qty={p.quantity} min={p.minQty} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(p.id)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`"${p.name}" o'chirilsinmi?`)) { deleteProduct(p.id); toast.success("O'chirildi"); } }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination tugmalari */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 border-t pt-4">
            <div className="text-xs text-muted-foreground">
              Jami {totalCount} tadan {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)} ko'rsatilmoqda
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                Oldingi
              </Button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(p => (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)} className="h-8 w-8 p-0">
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
