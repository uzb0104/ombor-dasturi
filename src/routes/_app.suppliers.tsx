import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, useConfirm, usePagination, PaginationBar, useSelection, BulkBar, SelectCell, useSortableData, SortButton, exportToCSV, exportToExcel } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Phone, MapPin, Plus, Edit, Trash2, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/suppliers")({ component: SuppliersPage });

type Form = { name: string; phone: string; address: string; debt: number };
const empty = (): Form => ({ name: "", phone: "", address: "", debt: 0 });

function SuppliersPage() {
  const { suppliers, products, addSupplier, updateSupplier, deleteSupplier } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [search, setSearch] = useState("");
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return suppliers.filter(x => !s || x.name.toLowerCase().includes(s) || x.phone.includes(s));
  }, [suppliers, search]);

  // Sorting
  const { items: sortedSuppliers, sortConfig, requestSort } = useSortableData(filtered);

  // Pagination
  const pg = usePagination(sortedSuppliers, 10);
  const pageIds = pg.paged.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => sel.has(id));

  const startEdit = (id: string) => {
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    setEditing(id);
    setForm({ name: s.name, phone: s.phone, address: s.address, debt: s.debt });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name) { toast.error("Nom majburiy"); return; }
    if (editing) { updateSupplier(editing, form); toast.success("Yangilandi"); }
    else { addSupplier({ id: `sup_${Math.random().toString(36).slice(2, 9)}`, ...form }); toast.success("Qo'shildi"); }
    setOpen(false); setEditing(null); setForm(empty());
  };

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({ title: "O'chirish", description: `${name} o'chirilsinmi?`, destructive: true, confirmText: "O'chirish" });
    if (ok) { deleteSupplier(id); toast.success("O'chirildi"); }
  };

  const removeBulk = async () => {
    const ok = await confirm({ title: "Tanlanganlarni o'chirish", description: `${sel.count} ta yetkazib beruvchi o'chiriladi.`, destructive: true, confirmText: "O'chirish" });
    if (!ok) return;
    const n = sel.count;
    sel.selected.forEach(id => deleteSupplier(id));
    sel.clear(); toast.success(`${n} ta o'chirildi`);
  };

  const handleExportCSV = () => {
    const headers = [
      { label: "Nomi", key: "name" },
      { label: "Telefon", key: "phone" },
      { label: "Manzil", key: "address" },
      { label: "Qarz (so'm)", key: "debt" },
    ];
    exportToCSV(filtered, headers, `yetkazib_beruvchilar_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportExcel = () => {
    const headers = [
      { label: "Nomi", key: "name" },
      { label: "Telefon", key: "phone" },
      { label: "Manzil", key: "address" },
      { label: "Qarz (so'm)", key: "debt" },
    ];
    exportToExcel(filtered, headers, "Yetkazib Beruvchilar Ro'yxati", `yetkazib_beruvchilar_${new Date().toISOString().slice(0, 10)}.xls`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {confirmNode}
      <PageHeader title="Yetkazib beruvchilar" subtitle={`${suppliers.length} ta yetkazib beruvchi`} actions={
        <>
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty()); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Yangi</Button></DialogTrigger>
            <DialogContent className="bg-card border rounded-2xl shadow-elevated p-6 max-w-md">
              <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi yetkazib beruvchi"}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div><Label>Nomi *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
                <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
                <div><Label>Manzil</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
                <div><Label>Qarz (so'm)</Label><Input type="number" value={form.debt} onChange={(e) => setForm({ ...form, debt: +e.target.value })} className="mt-1" /></div>
              </div>
              <DialogFooter><Button onClick={submit}>Saqlash</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      } />

      <Card className="p-4 rounded-2xl card-elevated border-border/60">
        <div className="relative max-w-md mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nom yoki telefon..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <BulkBar count={sel.count} onDelete={removeBulk} onClear={sel.clear} label="tanlandi" />
        
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)} aria-label="Hammasi" /></TableHead>
                <TableHead>
                  <SortButton label="Nomi" sortKey="name" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortButton label="Telefon" sortKey="phone" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <SortButton label="Manzil" sortKey="address" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="text-right">Tovarlar soni</TableHead>
                <TableHead className="text-right">
                  <SortButton label="Qarz" sortKey="debt" sortConfig={sortConfig} onSort={requestSort} />
                </TableHead>
                <TableHead className="text-right pr-4">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Yetkazib beruvchilar topilmadi</TableCell></TableRow>
              )}
              {pg.paged.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/40 transition-colors" data-state={sel.has(s.id) ? "selected" : undefined}>
                  <TableCell><SelectCell checked={sel.has(s.id)} onChange={() => sel.toggle(s.id)} /></TableCell>
                  <TableCell className="font-semibold">{s.name}
                    <div className="sm:hidden text-xs text-muted-foreground font-normal mt-0.5">{s.phone}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm font-medium"><Phone className="h-3 w-3 inline mr-1 opacity-60 text-muted-foreground" />{s.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1 opacity-60" />{s.address}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{products.filter(p => p.supplierId === s.id).length} ta</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.debt > 0 ? <span className="text-destructive font-bold">{formatSom(s.debt)}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap pr-4">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(s.id)} className="h-8 w-8"><Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeOne(s.id, s.name)} className="h-8 w-8 hover:bg-destructive/10">
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
