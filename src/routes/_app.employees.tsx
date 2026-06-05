import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  StatCard,
  useConfirm,
  usePagination,
  PaginationBar,
  useSelection,
  BulkBar,
  SelectCell,
} from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom, ROLES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Users, Wallet, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [form, setForm] = useState({
    name: "",
    phone: "",
    role: ROLES[1] as string,
    salary: 4000000,
    hireDate: new Date().toISOString().slice(0, 10),
  });
  const { confirm, confirmNode } = useConfirm();
  const sel = useSelection();
  const pg = usePagination(employees, 10);
  const pageIds = pg.paged.map((p) => p.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => sel.has(id));

  const totalSalary = employees
    .filter((e) => e.status === "Faol")
    .reduce((a, e) => a + e.salary, 0);
  const totalAdvance = employees.reduce((a, e) => a + e.advance, 0);

  const submit = () => {
    if (!form.name) {
      toast.error("Ism majburiy");
      return;
    }
    if (editing) {
      updateEmployee(editing, { ...form, role: form.role as "Admin" | "Sotuvchi" | "Omborchi" });
      toast.success("Yangilandi");
    } else {
      addEmployee({
        id: `emp_${Math.random().toString(36).slice(2, 9)}`,
        ...form,
        role: form.role as "Admin" | "Sotuvchi" | "Omborchi",
        advance: 0,
        status: "Faol",
      });
      toast.success("Xodim qo'shildi");
    }
    setOpen(false);
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      role: ROLES[1],
      salary: 4000000,
      hireDate: new Date().toISOString().slice(0, 10),
    });
  };

  const startEdit = (id: string) => {
    const e = employees.find((x) => x.id === id);
    if (!e) return;
    setEditing(id);
    setForm({ name: e.name, phone: e.phone, role: e.role, salary: e.salary, hireDate: e.hireDate });
    setOpen(true);
  };

  const giveAdvance = () => {
    if (!advanceFor) return;
    const emp = employees.find((e) => e.id === advanceFor);
    if (!emp) return;
    updateEmployee(advanceFor, { advance: emp.advance + advanceAmount });
    toast.success(`Avans berildi: ${formatSom(advanceAmount)}`);
    setAdvanceFor(null);
    setAdvanceAmount(0);
  };

  const removeOne = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Xodimni o'chirish",
      description: `${name} o'chirilsinmi?`,
      destructive: true,
      confirmText: "O'chirish",
    });
    if (ok) {
      deleteEmployee(id);
      toast.success("O'chirildi");
    }
  };
  const removeBulk = async () => {
    const ok = await confirm({
      title: "Tanlanganlarni o'chirish",
      description: `${sel.count} ta xodim o'chiriladi.`,
      destructive: true,
      confirmText: "O'chirish",
    });
    if (!ok) return;
    const n = sel.count;
    sel.selected.forEach((id) => deleteEmployee(id));
    sel.clear();
    toast.success(`${n} ta xodim o'chirildi`);
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader
        title="Xodimlar"
        subtitle={`${employees.length} ta xodim`}
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Yangi xodim
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Xodimni tahrirlash" : "Yangi xodim"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>F.I.SH</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Lavozim</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Oylik (so'm)</Label>
                  <Input
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Ishga olingan sana</Label>
                  <Input
                    type="date"
                    value={form.hireDate}
                    onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit}>Saqlash</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Xodimlar" value={String(employees.length)} icon={Users} accent="primary" />
        <StatCard
          label="Oylik jami (faol)"
          value={formatSom(totalSalary)}
          icon={Wallet}
          accent="info"
        />
        <StatCard
          label="Berilgan avanslar"
          value={formatSom(totalAdvance)}
          icon={TrendingDown}
          accent="warning"
        />
      </div>

      <Card className="rounded-2xl p-3 md:p-4">
        <BulkBar
          count={sel.count}
          onDelete={removeBulk}
          onClear={sel.clear}
          label="xodim tanlandi"
        />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => sel.toggleAll(pageIds, !!v)}
                  />
                </TableHead>
                <TableHead>F.I.SH</TableHead>
                <TableHead className="hidden sm:table-cell">Telefon</TableHead>
                <TableHead>Lavozim</TableHead>
                <TableHead className="hidden md:table-cell">Sana</TableHead>
                <TableHead className="text-right">Oylik</TableHead>
                <TableHead className="hidden sm:table-cell text-right">Avans</TableHead>
                <TableHead className="hidden md:table-cell text-right">Qoldiq</TableHead>
                <TableHead className="hidden sm:table-cell">Holat</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.map((e) => (
                <TableRow
                  key={e.id}
                  className="hover:bg-muted/40"
                  data-state={sel.has(e.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <SelectCell checked={sel.has(e.id)} onChange={() => sel.toggle(e.id)} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {e.name}
                    <div className="sm:hidden text-xs text-muted-foreground">{e.phone}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{e.phone}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{e.role}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {e.hireDate}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatSom(e.salary)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular-nums text-warning-foreground">
                    {formatSom(e.advance)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right tabular-nums font-semibold">
                    {formatSom(e.salary - e.advance)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={e.status === "Faol" ? "default" : "secondary"}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAdvanceFor(e.id);
                        setAdvanceAmount(0);
                      }}
                    >
                      <HandCoins className="h-3 w-3 mr-1" />
                      Avans
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(e.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeOne(e.id, e.name)}>
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

      <Dialog open={!!advanceFor} onOpenChange={(v) => !v && setAdvanceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avans berish</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Summa (so'm)</Label>
            <Input
              type="number"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(+e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={giveAdvance}>Tasdiqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
