import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, useConfirm, usePagination, PaginationBar, useSelection, BulkBar, SelectCell } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Phone, MapPin, Edit, Trash2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/customers")({ component: CustomersPage });

type Form = { name: string; phone: string; address: string; vehicle: string };
const empty = (firstBrand: string): Form => ({ name: "", phone: "", address: "", vehicle: firstBrand });

function CustomersPage() {
  const { customers, vehicleBrands, addCustomer, updateCustomer, deleteCustomer } = useStore();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty(vehicleBrands[0] || ""));
  const [search, setSearch] = useState("");
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return customers.filter(c => !s || c.name.toLowerCase().includes(s) || c.phone.includes(s));
  }, [customers, search]);
  const pg = usePagination(filtered, 10);
  const pageIds = pg.paged.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => sel.has(id));

  const startEdit = (id: string) => {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    setEditing(id);
    setForm({ name: c.name, phone: c.phone, address: c.address, vehicle: c.vehicle });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name) { toast.error(t("crm.required.name")); return; }
    if (editing) {
      updateCustomer(editing, { ...form, vehicle: form.vehicle as any });
      toast.success(t("crm.updated"));
    } else {
      addCustomer({ id: `cust_${Math.random().toString(36).slice(2, 9)}`, ...form, vehicle: form.vehicle as any, totalPurchases: 0, debt: 0 });
      toast.success(t("crm.created"));
    }
    setOpen(false); setEditing(null); setForm(empty(vehicleBrands[0] || ""));
  };

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({ title: `${name}`, description: t("common.delete") + "?", destructive: true, confirmText: t("common.delete") });
    if (!ok) return;
    const snapshot = customers.find(c => c.id === id);
    deleteCustomer(id);
    toast.success(t("crm.deleted_one") + `: ${name}`, {
      action: snapshot ? { label: t("crm.undo"), onClick: () => addCustomer(snapshot) } : undefined,
    });
  };
  const removeBulk = async () => {
    const ok = await confirm({ title: `${sel.count} ${t("crm.bulk.label")}`, description: t("common.delete") + "?", destructive: true, confirmText: t("common.delete") });
    if (!ok) return;
    const snapshots = customers.filter(c => sel.has(c.id));
    const names = snapshots.map(s => s.name);
    snapshots.forEach(s => deleteCustomer(s.id));
    sel.clear();
    toast.success(`${snapshots.length} ${t("crm.deleted")}`, {
      description: names.slice(0, 5).join(", ") + (names.length > 5 ? "…" : ""),
      action: { label: t("crm.undo"), onClick: () => snapshots.forEach(s => addCustomer(s)) },
    });
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader title={t("crm.title")} subtitle={`${customers.length} ${t("crm.count")}`} actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty(vehicleBrands[0] || "")); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{t("crm.new")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? t("crm.edit") : t("crm.new")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("crm.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t("crm.phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123 45 67" /></div>
              <div><Label>{t("crm.address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>{t("crm.vehicle")}</Label>
                <Select value={form.vehicle} onValueChange={(v) => setForm({ ...form, vehicle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{vehicleBrands.map((b: string) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={submit}>{t("common.save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <Card className="p-3 md:p-4 rounded-2xl">
        <div className="relative max-w-md mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("crm.search")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <BulkBar count={sel.count} onDelete={removeBulk} onClear={sel.clear} label={t("crm.bulk.label")} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)} /></TableHead>
              <TableHead>{t("crm.name")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("crm.phone")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("crm.address")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("crm.vehicle")}</TableHead>
              <TableHead className="hidden md:table-cell text-right">{t("crm.purchases")}</TableHead>
              <TableHead className="text-right">{t("crm.debt")}</TableHead>
              <TableHead className="text-right">{t("crm.actions")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pg.paged.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/40" data-state={sel.has(c.id) ? "selected" : undefined}>
                  <TableCell><SelectCell checked={sel.has(c.id)} onChange={() => sel.toggle(c.id)} /></TableCell>
                  <TableCell className="font-medium">{c.name}
                    <div className="sm:hidden text-xs text-muted-foreground">{c.phone} · {c.vehicle}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm"><Phone className="h-3 w-3 inline mr-1 opacity-60" />{c.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1 opacity-60" />{c.address}</TableCell>
                  <TableCell className="hidden sm:table-cell"><Badge variant="secondary">{c.vehicle}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums font-semibold">{formatSom(c.totalPurchases)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.debt > 0 ? <span className="text-destructive font-semibold">{formatSom(c.debt)}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(c.id)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeOne(c.id, c.name)}>
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
