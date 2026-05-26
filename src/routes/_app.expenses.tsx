import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, useConfirm, usePagination, PaginationBar, useSelection, BulkBar, SelectCell } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, TrendingUp, TrendingDown, Edit, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const CATS = ["Ish haqi","Soliq","Transport","Elektr","Ombor ijarasi","Ta'mirlash","Internet","Boshqa"];

export const Route = createFileRoute("/_app/expenses")({ component: ExpensesPage });

type Form = { category: string; amount: number; note: string };
const empty = (): Form => ({ category: CATS[0]!, amount: 0, note: "" });

function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, sales } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [detail, setDetail] = useState<"expenses" | "profit" | "net" | null>(null);
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();

  const total = expenses.reduce((a,e) => a + e.amount, 0);
  const profit = sales.reduce((a,s) => a + s.profit, 0);

  const sortedExpenses = useMemo(() =>
    [...expenses].sort((a, b) => +new Date(b.date) - +new Date(a.date)), [expenses]);
  const pg = usePagination(sortedExpenses, 12);
  const pageIds = pg.paged.map(p => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => sel.has(id));

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach(e => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const startEdit = (id: string) => {
    const e = expenses.find(x => x.id === id);
    if (!e) return;
    setEditing(id);
    setForm({ category: e.category, amount: e.amount, note: e.note });
    setOpen(true);
  };

  const submit = () => {
    if (!form.amount) { toast.error("Summa kiriting"); return; }
    if (editing) { updateExpense(editing, form); toast.success("Yangilandi"); }
    else { addExpense({ id: `exp_${Math.random().toString(36).slice(2,9)}`, date: new Date().toISOString(), ...form }); toast.success("Xarajat qo'shildi"); }
    setOpen(false); setEditing(null); setForm(empty());
  };

  const removeOne = async (id: string) => {
    const ok = await confirm({ title: "Xarajatni o'chirish", description: "Bu xarajat yozuvi o'chirilsinmi?", destructive: true, confirmText: "O'chirish" });
    if (!ok) return;
    const snap = expenses.find(e => e.id === id);
    deleteExpense(id);
    toast.success("O'chirildi", { action: snap ? { label: "Qaytarish", onClick: () => addExpense(snap) } : undefined });
  };
  const removeBulk = async () => {
    const ok = await confirm({ title: "Tanlanganlarni o'chirish", description: `${sel.count} ta xarajat o'chiriladi.`, destructive: true, confirmText: "O'chirish" });
    if (!ok) return;
    const snaps = expenses.filter(e => sel.has(e.id));
    snaps.forEach(e => deleteExpense(e.id));
    sel.clear();
    toast.success(`${snaps.length} ta xarajat o'chirildi`, {
      description: snaps.slice(0, 5).map(e => `${e.category}: ${formatSom(e.amount)}`).join(" · "),
      action: { label: "Qaytarish", onClick: () => snaps.forEach(e => addExpense(e)) },
    });
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader title="Xarajatlar" subtitle={`${expenses.length} ta yozuv`} actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty()); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Yangi xarajat</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Xarajatni tahrirlash" : "Yangi xarajat"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Turi</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Summa</Label><Input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: +e.target.value})} /></div>
              <div><Label>Izoh</Label><Input value={form.note} onChange={(e) => setForm({...form, note: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Saqlash</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Jami xarajatlar" value={formatSom(total)} icon={Receipt} accent="warning" onClick={() => setDetail("expenses")} />
        <StatCard label="Yalpi foyda" value={formatSom(profit)} icon={TrendingUp} accent="success" onClick={() => setDetail("profit")} />
        <StatCard label="Sof foyda" value={formatSom(profit - total)} icon={TrendingDown} accent={profit - total > 0 ? "success" : "destructive"} onClick={() => setDetail("net")} />
      </div>

      <ExpenseDetailDialog open={detail} onClose={() => setDetail(null)} expenses={sortedExpenses} sales={sales} />


      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Toifalar bo'yicha</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => `${(v/1e6).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v: number) => formatSom(v)} />
              <Bar dataKey="value" fill="var(--chart-4)" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl p-3 md:p-4">
        <BulkBar count={sel.count} onDelete={removeBulk} onClear={sel.clear} label="xarajat tanlandi" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-10"><Checkbox checked={allChecked} onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)} /></TableHead>
              <TableHead>Sana</TableHead><TableHead>Turi</TableHead>
              <TableHead className="hidden sm:table-cell">Izoh</TableHead>
              <TableHead className="text-right">Summa</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pg.paged.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/40" data-state={sel.has(e.id) ? "selected" : undefined}>
                  <TableCell><SelectCell checked={sel.has(e.id)} onChange={() => sel.toggle(e.id)} /></TableCell>
                  <TableCell className="text-sm">{new Date(e.date).toLocaleDateString("uz-UZ")}</TableCell>
                  <TableCell><span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">{e.category}</span></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{e.note}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatSom(e.amount)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(e.id)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeOne(e.id)}>
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

type DetailKind = "expenses" | "profit" | "net" | null;
function ExpenseDetailDialog({
  open, onClose, expenses, sales,
}: {
  open: DetailKind;
  onClose: () => void;
  expenses: ReturnType<typeof useStore.getState>["expenses"];
  sales: ReturnType<typeof useStore.getState>["sales"];
}) {
  if (!open) return null;
  const title =
    open === "expenses" ? "Jami xarajatlar — barcha tranzaksiyalar"
    : open === "profit" ? "Yalpi foyda — sotuvlar bo'yicha"
    : "Sof foyda — sotuvlar va xarajatlar";

  const expRows = [...expenses].sort((a,b) => +new Date(b.date) - +new Date(a.date));
  const saleRows = [...sales].sort((a,b) => +new Date(b.date) - +new Date(a.date));

  return (
    <Dialog open={!!open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          {(open === "expenses" || open === "net") && (
            <div>
              <div className="font-semibold mb-2 text-warning-foreground">Xarajatlar ({expRows.length})</div>
              <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                {expRows.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <div className="font-medium">{e.category}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("uz-UZ")} · {e.note || "—"}</div>
                    </div>
                    <div className="tabular-nums text-destructive">−{formatSom(e.amount)}</div>
                  </div>
                ))}
                {expRows.length === 0 && <div className="px-3 py-4 text-muted-foreground text-center">Yo'q</div>}
              </div>
            </div>
          )}
          {(open === "profit" || open === "net") && (
            <div>
              <div className="font-semibold mb-2 text-success">Sotuvlar foydasi ({saleRows.length})</div>
              <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                {saleRows.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <div className="font-medium">#{s.id.slice(-6).toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString("uz-UZ")} · {s.paymentType} · sotuv {formatSom(s.total)}</div>
                    </div>
                    <div className="tabular-nums text-success font-semibold">+{formatSom(s.profit)}</div>
                  </div>
                ))}
                {saleRows.length === 0 && <div className="px-3 py-4 text-muted-foreground text-center">Yo'q</div>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
