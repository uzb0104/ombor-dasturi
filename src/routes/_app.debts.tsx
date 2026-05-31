import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard, usePagination, PaginationBar } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ArrowDownCircle, ArrowUpCircle, History, Wallet, User, PlusCircle, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/debts")({ component: DebtsPage });

function DebtsPage() {
  const { customers, suppliers, debtPayments, addDebtPayment } = useStore();
  
  const fromCustomers = customers.filter(c => c.debt > 0);
  const toSuppliers = suppliers.filter(s => s.debt > 0);
  const totalIn = fromCustomers.reduce((a,c) => a + c.debt, 0);
  const totalOut = toSuppliers.reduce((a,s) => a + s.debt, 0);

  // Dialog State
  const [open, setOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"customer" | "supplier">("customer");
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [maxDebt, setMaxDebt] = useState(0);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Naqd" | "Karta">("Naqd");
  const [note, setNote] = useState("");

  // Pagination for payment history
  const historyList = debtPayments || [];
  const pgHistory = usePagination(historyList, 10);

  const handleOpenPayment = (type: "customer" | "supplier", id: string, name: string, debt: number) => {
    setPaymentType(type);
    setTargetId(id);
    setTargetName(name);
    setMaxDebt(debt);
    setAmount(debt); // Default to full payment
    setPaymentMethod("Naqd");
    setNote("");
    setOpen(true);
  };

  const handlePay = () => {
    if (amount <= 0) {
      toast.error("To'lov summasi 0 dan katta bo'lishi kerak");
      return;
    }
    if (amount > maxDebt) {
      toast.error("To'lov summasi qarzdan ko'p bo'lishi mumkin emas");
      return;
    }

    addDebtPayment({
      id: `pay_${Math.random().toString(36).slice(2, 9)}`,
      date: new Date().toISOString(),
      type: paymentType,
      targetId,
      targetName,
      amount,
      paymentMethod,
      note: note.trim() || undefined,
    });

    toast.success("To'lov muvaffaqiyatli amalga oshirildi");
    setOpen(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Qarzdorlik" subtitle="Mijozlar va ta'minotchilar bilan qarzdorlik hisob-kitoblari" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Bizga qarzdor (Mijozlar)" value={formatSom(totalIn)} icon={ArrowDownCircle} accent="success" />
        <StatCard label="Biz qarzdormiz (Ta'minotchilar)" value={formatSom(totalOut)} icon={ArrowUpCircle} accent="destructive" />
      </div>

      {/* Repayment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card border rounded-2xl shadow-elevated p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Qarz To'lash
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted/40 p-3.5 rounded-xl border border-border/40 space-y-1">
              <div className="text-xs text-muted-foreground uppercase font-semibold">
                {paymentType === "customer" ? "Mijoz" : "Yetkazib beruvchi"}
              </div>
              <div className="font-bold text-base text-foreground">{targetName}</div>
              <div className="flex justify-between text-xs pt-1.5 border-t border-border/60">
                <span className="text-muted-foreground">Umumiy qarz:</span>
                <span className="font-bold text-destructive tabular-nums">{formatSom(maxDebt)}</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">To'lov summasi *</Label>
              <Input
                type="number"
                className="mt-1"
                max={maxDebt}
                value={amount}
                onChange={(e) => setAmount(Math.min(maxDebt, Math.max(0, +e.target.value)))}
              />
              <div className="mt-1 flex justify-end gap-1.5">
                <button
                  onClick={() => setAmount(Math.round(maxDebt / 2))}
                  className="text-[10px] bg-muted hover:bg-muted/80 px-2 py-0.5 rounded border font-medium"
                >
                  50%
                </button>
                <button
                  onClick={() => setAmount(maxDebt)}
                  className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20 font-medium"
                >
                  Hammasi
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">To'lov turi</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Naqd">Naqd pul</SelectItem>
                    <SelectItem value="Karta">Plastik karta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase">Qolgan qarz</Label>
                <div className="h-9 border rounded-md px-3 bg-muted/20 flex items-center mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatSom(maxDebt - amount)}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Izoh</Label>
              <Input
                placeholder="masalan: Qisman to'lov"
                className="mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={handlePay} disabled={amount <= 0}>
              To'lovni tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="in" className="space-y-4">
        <TabsList>
          <TabsTrigger value="in" className="flex items-center gap-1.5">
            <ArrowDownCircle className="h-4 w-4 text-success" />
            <span>Kimdan olinadi ({fromCustomers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="out" className="flex items-center gap-1.5">
            <ArrowUpCircle className="h-4 w-4 text-destructive" />
            <span>Kimga beriladi ({toSuppliers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <History className="h-4 w-4 text-primary" />
            <span>To'lovlar tarixi ({historyList.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in" className="space-y-4">
          <Card className="rounded-2xl p-4 card-elevated border-border/60">
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead className="text-right">Qarz miqdori</TableHead>
                    <TableHead className="text-right pr-4">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fromCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Hozirda bizga qarzdor mijozlar mavjud emas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fromCustomers.map(c => (
                      <TableRow
                        key={c.id}
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => handleOpenPayment("customer", c.id, c.name, c.debt)}
                      >
                        <TableCell className="font-semibold">{c.name}</TableCell>
                        <TableCell className="tabular-nums">{c.phone}</TableCell>
                        <TableCell className="text-right text-destructive font-bold tabular-nums">
                          {formatSom(c.debt)}
                        </TableCell>
                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayment("customer", c.id, c.name, c.debt)}
                          >
                            Qarzni to'lash
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="out" className="space-y-4">
          <Card className="rounded-2xl p-4 card-elevated border-border/60">
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Yetkazib beruvchi</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead className="text-right">Qarz miqdori</TableHead>
                    <TableHead className="text-right pr-4">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Hozirda bizning qarzdorligimiz mavjud emas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    toSuppliers.map(s => (
                      <TableRow
                        key={s.id}
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => handleOpenPayment("supplier", s.id, s.name, s.debt)}
                      >
                        <TableCell className="font-semibold">{s.name}</TableCell>
                        <TableCell className="tabular-nums">{s.phone}</TableCell>
                        <TableCell className="text-right text-destructive font-bold tabular-nums">
                          {formatSom(s.debt)}
                        </TableCell>
                        <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPayment("supplier", s.id, s.name, s.debt)}
                          >
                            Qarzni to'lash
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="rounded-2xl p-4 card-elevated border-border/60">
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Sana</TableHead>
                    <TableHead>Kim</TableHead>
                    <TableHead>Turi</TableHead>
                    <TableHead>To'lov turi</TableHead>
                    <TableHead className="text-right">Summa</TableHead>
                    <TableHead>Izoh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pgHistory.paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Hozircha qarz to'lovlari tarixi mavjud emas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pgHistory.paged.map(p => (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell className="text-sm font-medium tabular-nums">
                          {new Date(p.date).toLocaleString("uz-UZ")}
                        </TableCell>
                        <TableCell className="font-semibold">{p.targetName}</TableCell>
                        <TableCell>
                          <Badge variant={p.type === "customer" ? "secondary" : "outline"}>
                            {p.type === "customer" ? "Mijoz" : "Ta'minotchi"}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.paymentMethod}</TableCell>
                        <TableCell className="text-right text-success font-bold tabular-nums">
                          {formatSom(p.amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {p.note || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginationBar {...pgHistory} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
