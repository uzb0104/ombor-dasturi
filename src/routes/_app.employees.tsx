import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom, ROLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Users, Wallet, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, HandCoins, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/employees")({ component: EmployeesPage });

function EmployeesPage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [advanceFor, setAdvanceFor] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", role: ROLES[1] as string, salary: 4000000, hireDate: new Date().toISOString().slice(0,10) });

  const totalSalary = employees.reduce((a,e) => a + e.salary, 0);
  const totalAdvance = employees.reduce((a,e) => a + e.advance, 0);

  const submit = () => {
    if (!form.name) { toast.error("Ism majburiy"); return; }
    if (editing) {
      updateEmployee(editing, { ...form, role: form.role as any });
      toast.success("Yangilandi");
    } else {
      addEmployee({
        id: `emp_${Math.random().toString(36).slice(2,9)}`,
        ...form, role: form.role as any, advance: 0, status: "Faol",
      });
      toast.success("Xodim qo'shildi");
    }
    setOpen(false); setEditing(null);
    setForm({ name: "", phone: "", role: ROLES[1], salary: 4000000, hireDate: new Date().toISOString().slice(0,10) });
  };

  const startEdit = (id: string) => {
    const e = employees.find(x => x.id === id);
    if (!e) return;
    setEditing(id);
    setForm({ name: e.name, phone: e.phone, role: e.role, salary: e.salary, hireDate: e.hireDate });
    setOpen(true);
  };

  const giveAdvance = () => {
    if (!advanceFor) return;
    const emp = employees.find(e => e.id === advanceFor);
    if (!emp) return;
    updateEmployee(advanceFor, { advance: emp.advance + advanceAmount });
    toast.success(`Avans berildi: ${formatSom(advanceAmount)}`);
    setAdvanceFor(null); setAdvanceAmount(0);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Xodimlar" subtitle={`${employees.length} ta xodim`} actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Yangi xodim</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Xodimni tahrirlash" : "Yangi xodim"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>F.I.SH</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} /></div>
              <div><Label>Lavozim</Label>
                <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Oylik (so'm)</Label><Input type="number" value={form.salary} onChange={(e) => setForm({...form, salary: +e.target.value})} /></div>
              <div><Label>Ishga olingan sana</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm({...form, hireDate: e.target.value})} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Saqlash</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Xodimlar" value={String(employees.length)} icon={Users} accent="primary" />
        <StatCard label="Oylik jami" value={formatSom(totalSalary)} icon={Wallet} accent="info" />
        <StatCard label="Berilgan avanslar" value={formatSom(totalAdvance)} icon={TrendingDown} accent="warning" />
      </div>

      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>F.I.SH</TableHead><TableHead>Telefon</TableHead><TableHead>Lavozim</TableHead>
              <TableHead>Sana</TableHead><TableHead className="text-right">Oylik</TableHead>
              <TableHead className="text-right">Avans</TableHead><TableHead className="text-right">Qoldiq</TableHead>
              <TableHead>Holat</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-sm">{e.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{e.role}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.hireDate}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatSom(e.salary)}</TableCell>
                  <TableCell className="text-right tabular-nums text-warning-foreground">{formatSom(e.advance)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatSom(e.salary - e.advance)}</TableCell>
                  <TableCell><Badge variant={e.status === "Faol" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => { setAdvanceFor(e.id); setAdvanceAmount(0); }}>
                      <HandCoins className="h-3 w-3 mr-1" />Avans
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(e.id)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`${e.name} ni o'chirish?`)) { deleteEmployee(e.id); toast.success("O'chirildi"); } }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!advanceFor} onOpenChange={(v) => !v && setAdvanceFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Avans berish</DialogTitle></DialogHeader>
          <div><Label>Summa (so'm)</Label><Input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(+e.target.value)} /></div>
          <DialogFooter><Button onClick={giveAdvance}>Tasdiqlash</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
