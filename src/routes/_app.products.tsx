import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatusBadge, useConfirm, usePagination, PaginationBar, useSelection, BulkBar, SelectCell } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, Package, ScanBarcode } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type FormState = {
  name: string; barcode: string;
  vehicle: string; category: string;
  supplierId: string; buyPrice: number; sellPrice: number; quantity: number; minQty: number;
  unitBrand: string; amperage: string; voltage: string; tireSize: string; tireSeason: string;
};

const emptyForm = (firstCategory: string, firstBrand: string): FormState => ({
  name: "", barcode: "",
  vehicle: firstBrand,
  category: firstCategory,
  supplierId: "", buyPrice: 0, sellPrice: 0, quantity: 0, minQty: 5,
  unitBrand: "", amperage: "", voltage: "12V", tireSize: "", tireSeason: "Universal",
});

const isBattery = (cat: string) => /akkumulyator/i.test(cat);
const isTire = (cat: string) => /shina|balon/i.test(cat);

function ProductsPage() {
  const { products, suppliers, categories, vehicleBrands, addProduct, updateProduct, deleteProduct, vehicleFilter } = useStore();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [veh, setVeh] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(categories[0] || "", vehicleBrands[0] || ""));
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  const filtered = useMemo(() => products.filter(p => {
    const s = search.toLowerCase();
    if (search && !p.name.toLowerCase().includes(s) && !(p.barcode || "").includes(search)) return false;
    if (cat !== "all" && p.category !== cat) return false;
    const v = veh !== "all" ? veh : vehicleFilter !== "all" ? vehicleFilter : null;
    if (v && p.vehicle !== v) return false;
    return true;
  }), [products, search, cat, veh, vehicleFilter]);

  const pg = usePagination(filtered, 12);
  const pageIds = pg.paged.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => sel.has(id));

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
    // Generates a short alphanumeric box-code (e.g. B7RTC, 48RCT3303)
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    do {
      const len = 5 + Math.floor(Math.random() * 4);
      code = Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    } while (products.some(p => p.barcode === code));
    setForm(f => ({ ...f, barcode: code }));
    toast.success("Kod yaratildi");
  };

  const submit = () => {
    if (!form.name.trim()) { toast.error("Tovar nomi majburiy"); return; }
    const bc = form.barcode.trim().toUpperCase();
    if (bc) {
      const dup = products.find(p => p.barcode === bc && p.id !== editing);
      if (dup) { toast.error(`Bu kod allaqachon mavjud: ${dup.name}`); return; }
    }
    if (editing) {
      updateProduct(editing, { ...form, barcode: bc, sku: "" });
      toast.success("Tovar yangilandi");
    } else {
      addProduct({
        id: `prd_${Math.random().toString(36).slice(2, 9)}`,
        sku: "", ...form, barcode: bc,
        supplierId: form.supplierId || suppliers[0]?.id || "",
      });
      toast.success("Tovar qo'shildi");
    }
    setOpen(false); setEditing(null); setForm(emptyForm(categories[0] || "", vehicleBrands[0] || ""));
  };

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({ title: "Tovarni o'chirish", description: `"${name}" o'chirilsinmi?`, destructive: true, confirmText: "O'chirish" });
    if (!ok) return;
    const snap = products.find(p => p.id === id);
    deleteProduct(id);
    toast.success(`O'chirildi: ${name}`, {
      action: snap ? { label: "Qaytarish", onClick: () => addProduct(snap) } : undefined,
    });
  };

  const removeBulk = async () => {
    const ok = await confirm({ title: "Tanlanganlarni o'chirish", description: `${sel.count} ta tovar o'chiriladi. Davom etilsinmi?`, destructive: true, confirmText: "O'chirish" });
    if (!ok) return;
    const snaps = products.filter(p => sel.has(p.id));
    const names = snaps.map(p => p.name);
    snaps.forEach(p => deleteProduct(p.id));
    sel.clear();
    toast.success(`${snaps.length} ta tovar o'chirildi`, {
      description: names.slice(0, 5).join(", ") + (names.length > 5 ? `, +${names.length - 5}` : ""),
      action: { label: "Qaytarish", onClick: () => snaps.forEach(p => addProduct(p)) },
    });
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader
        title="Tovarlar"
        subtitle={`Jami ${products.length} ta tovar`}
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm(categories[0] || "", vehicleBrands[0] || "")); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Yangi tovar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Tovarni tahrirlash" : "Yangi tovar"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label>Nomi *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Tormoz kolodkasi" /></div>
                <div className="sm:col-span-2">
                  <Label>Kod (karobka raqami / SKU) — ixtiyoriy</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value.toUpperCase() })}
                      placeholder="Masalan: B7RTC, 32009, 48RCT3303"
                      className="font-mono uppercase tracking-wider"
                      autoFocus={!editing}
                    />
                    <Button type="button" variant="outline" onClick={generateBarcode}>
                      <ScanBarcode className="h-4 w-4 mr-1" />Yaratish
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Karobka ustidagi kod yoki SKU. Lotin harflari katta yoziladi, raqam va belgilar ham mumkin. Bo'sh qoldirilsa, tovar kodsiz saqlanadi.</p>
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
        }
      />

      <Card className="p-3 md:p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom yoki kod..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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

        <BulkBar count={sel.count} onDelete={removeBulk} onClear={sel.clear} label="tovar tanlandi" />

        <div className="overflow-x-auto -mx-3 md:mx-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allChecked} onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)} aria-label="Hammasi" />
                </TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead className="hidden md:table-cell">Kod</TableHead>
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
              {pg.paged.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Tovarlar topilmadi</TableCell></TableRow>
              )}
              {pg.paged.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/40" data-state={sel.has(p.id) ? "selected" : undefined}>
                  <TableCell><SelectCell checked={sel.has(p.id)} onChange={() => sel.toggle(p.id)} /></TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted grid place-items-center shrink-0"><Package className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="min-w-0">
                        <div className="truncate">{p.name}</div>
                        <div className="sm:hidden text-xs text-muted-foreground">{p.vehicle} · {p.category}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs font-mono uppercase text-muted-foreground">
                    {p.barcode ? p.barcode : <span className="italic normal-case">kodsiz</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{p.vehicle}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{p.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums text-sm">{formatSom(p.buyPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">{formatSom(p.sellPrice)}</TableCell>
                  <TableCell className="hidden sm:table-cell"><StatusBadge qty={p.quantity} min={p.minQty} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(p.id)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeOne(p.id, p.name)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginationBar {...pg} />
      </Card>
    </div>
  );
}
