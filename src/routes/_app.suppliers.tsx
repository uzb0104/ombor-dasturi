import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Phone, MapPin, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/suppliers")({ component: SuppliersPage });

type Form = { name: string; phone: string; address: string; debt: number };
const empty = (): Form => ({ name: "", phone: "", address: "", debt: 0 });

function SuppliersPage() {
  const { suppliers, products, addSupplier, updateSupplier, deleteSupplier } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty());

  const startEdit = (id: string) => {
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    setEditing(id);
    setForm({ name: s.name, phone: s.phone, address: s.address, debt: s.debt });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name) { toast.error("Nom majburiy"); return; }
    if (editing) {
      updateSupplier(editing, form);
      toast.success("Yangilandi");
    } else {
      addSupplier({ id: `sup_${Math.random().toString(36).slice(2, 9)}`, ...form });
      toast.success("Qo'shildi");
    }
    setOpen(false); setEditing(null); setForm(empty());
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Yetkazib beruvchilar" subtitle={`${suppliers.length} ta yetkazib beruvchi`} actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty()); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Yangi</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi yetkazib beruvchi"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nomi</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Manzil</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>Qarz (so'm)</Label><Input type="number" value={form.debt} onChange={(e) => setForm({ ...form, debt: +e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Saqlash</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nomi</TableHead><TableHead>Telefon</TableHead><TableHead>Manzil</TableHead>
              <TableHead className="text-right">Tovarlar</TableHead><TableHead className="text-right">Qarz</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {suppliers.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm"><Phone className="h-3 w-3 inline mr-1 opacity-60" />{s.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1 opacity-60" />{s.address}</TableCell>
                  <TableCell className="text-right tabular-nums">{products.filter(p => p.supplierId === s.id).length}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.debt > 0 ? <span className="text-destructive font-semibold">{formatSom(s.debt)}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(s.id)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`${s.name} ni o'chirish?`)) { deleteSupplier(s.id); toast.success("O'chirildi"); } }}>
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
