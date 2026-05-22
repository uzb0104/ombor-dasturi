import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { CATEGORIES, VEHICLE_BRANDS, formatSom } from "@/lib/constants";
import { useMemo, useState } from "react";
import { Plus, Search, Edit, Trash2, Package, ScanBarcode } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type FormState = {
  name: string; barcode: string;
  vehicle: (typeof VEHICLE_BRANDS)[number]; category: (typeof CATEGORIES)[number];
  supplierId: string; buyPrice: number; sellPrice: number; quantity: number; minQty: number;
};

const emptyForm = (): FormState => ({
  name: "", barcode: "",
  vehicle: VEHICLE_BRANDS[0] as (typeof VEHICLE_BRANDS)[number],
  category: CATEGORIES[0] as (typeof CATEGORIES)[number],
  supplierId: "", buyPrice: 0, sellPrice: 0, quantity: 0, minQty: 5,
});

function ProductsPage() {
  const { products, suppliers, addProduct, updateProduct, deleteProduct, vehicleFilter } = useStore();
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [veh, setVeh] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const filtered = useMemo(() => products.filter(p => {
    const s = search.toLowerCase();
    if (search && !p.name.toLowerCase().includes(s) && !(p.barcode || "").includes(search)) return false;
    if (cat !== "all" && p.category !== cat) return false;
    const v = veh !== "all" ? veh : vehicleFilter !== "all" ? vehicleFilter : null;
    if (v && p.vehicle !== v) return false;
    return true;
  }), [products, search, cat, veh, vehicleFilter]);

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
    setForm(f => ({ ...f, barcode: `486${Math.floor(100000000 + Math.random() * 899999999)}` }));
    toast.success("Barkod yaratildi");
  };

  const submit = () => {
    if (!form.name.trim()) { toast.error("Tovar nomi majburiy"); return; }
    if (editing) {
      updateProduct(editing, { ...form, sku: "" });
      toast.success("Tovar yangilandi");
    } else {
      addProduct({
        id: `prd_${Math.random().toString(36).slice(2, 9)}`,
        sku: "",
        ...form,
        supplierId: form.supplierId || suppliers[0]?.id || "",
      });
      toast.success("Tovar qo'shildi");
    }
    setOpen(false); setEditing(null); setForm(emptyForm());
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tovarlar"
        subtitle={`Jami ${products.length} ta tovar`}
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm()); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" />Yangi tovar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Tovarni tahrirlash" : "Yangi tovar"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Nomi *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Tormoz kolodkasi" /></div>
                <div className="col-span-2">
                  <Label>Barkod (ixtiyoriy)</Label>
                  <div className="flex gap-2">
                    <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Skanerlash yoki qo'lda kiriting" className="font-mono" />
                    <Button type="button" variant="outline" onClick={generateBarcode}><ScanBarcode className="h-4 w-4 mr-1" />Yaratish</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Bo'sh qoldirilsa, tovar barkodsiz saqlanadi.</p>
                </div>
                <div><Label>Brend</Label>
                  <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v as FormState["vehicle"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VEHICLE_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Kategoriya</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as FormState["category"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Yetkazib beruvchi</Label>
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

      <Card className="p-4 rounded-2xl">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Nom yoki barkod..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={veh} onValueChange={setVeh}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Brend" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Barcha brendlar</SelectItem>{VEHICLE_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategoriya" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Barcha kategoriyalar</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead>Brend</TableHead>
                <TableHead>Kategoriya</TableHead>
                <TableHead className="text-right">Miqdor</TableHead>
                <TableHead className="text-right">Sotib olish</TableHead>
                <TableHead className="text-right">Sotuv</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Tovarlar topilmadi</TableCell></TableRow>
              )}
              {filtered.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {p.barcode ? p.barcode : <span className="italic">barkodsiz</span>}
                  </TableCell>
                  <TableCell>{p.vehicle}</TableCell>
                  <TableCell className="text-sm">{p.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{formatSom(p.buyPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">{formatSom(p.sellPrice)}</TableCell>
                  <TableCell><StatusBadge qty={p.quantity} min={p.minQty} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(p.id)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { deleteProduct(p.id); toast.success("O'chirildi"); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
