import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const CATS = ["Ish haqi","Soliq","Transport","Elektr","Ombor ijarasi","Ta'mirlash","Internet","Boshqa"];

export const Route = createFileRoute("/_app/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  const { expenses, addExpense, sales } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: CATS[0]!, amount: 0, note: "" });

  const total = expenses.reduce((a,e) => a + e.amount, 0);
  const profit = sales.reduce((a,s) => a + s.profit, 0);

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach(e => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const submit = () => {
    if (!form.amount) { toast.error("Summa kiriting"); return; }
    addExpense({ id: `exp_${Math.random().toString(36).slice(2,9)}`, date: new Date().toISOString(), ...form });
    toast.success("Xarajat qo'shildi"); setOpen(false);
    setForm({ category: CATS[0]!, amount: 0, note: "" });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Xarajatlar" subtitle={`${expenses.length} ta yozuv`} actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Yangi xarajat</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yangi xarajat</DialogTitle></DialogHeader>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Jami xarajatlar" value={formatSom(total)} icon={Receipt} accent="warning" />
        <StatCard label="Jami foyda" value={formatSom(profit)} icon={TrendingUp} accent="success" />
        <StatCard label="Sof foyda" value={formatSom(profit - total)} icon={TrendingDown} accent={profit - total > 0 ? "success" : "destructive"} />
      </div>

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

      <Card className="rounded-2xl">
        <Table>
          <TableHeader><TableRow><TableHead>Sana</TableHead><TableHead>Turi</TableHead><TableHead>Izoh</TableHead><TableHead className="text-right">Summa</TableHead></TableRow></TableHeader>
          <TableBody>
            {expenses.map(e => (
              <TableRow key={e.id} className="hover:bg-muted/40">
                <TableCell className="text-sm">{new Date(e.date).toLocaleDateString("uz-UZ")}</TableCell>
                <TableCell><span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">{e.category}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.note}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{formatSom(e.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
