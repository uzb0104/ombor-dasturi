import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom, VEHICLE_BRANDS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Phone, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/customers")({ component: CustomersPage });

function CustomersPage() {
  const { customers, addCustomer } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", vehicle: VEHICLE_BRANDS[0] as string });

  const submit = () => {
    if (!form.name) { toast.error("Ism majburiy"); return; }
    addCustomer({ id: `cust_${Math.random().toString(36).slice(2,9)}`, ...form, vehicle: form.vehicle as any, totalPurchases: 0, debt: 0 });
    toast.success("Mijoz qo'shildi"); setOpen(false);
    setForm({ name: "", phone: "", address: "", vehicle: VEHICLE_BRANDS[0] });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Mijozlar (CRM)" subtitle={`${customers.length} ta mijoz`} actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Yangi mijoz</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yangi mijoz</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>F.I.SH</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="+998 90 123 45 67" /></div>
              <div><Label>Manzil</Label><Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} /></div>
              <div><Label>Avtomobil</Label>
                <Select value={form.vehicle} onValueChange={(v) => setForm({...form, vehicle: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLE_BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={submit}>Saqlash</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>F.I.SH</TableHead><TableHead>Telefon</TableHead><TableHead>Manzil</TableHead>
              <TableHead>Avtomobil</TableHead><TableHead className="text-right">Jami xaridlar</TableHead>
              <TableHead className="text-right">Qarz</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {customers.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm"><Phone className="h-3 w-3 inline mr-1 opacity-60" />{c.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1 opacity-60" />{c.address}</TableCell>
                  <TableCell><Badge variant="secondary">{c.vehicle}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">{formatSom(c.totalPurchases)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.debt > 0 ? <span className="text-destructive font-semibold">{formatSom(c.debt)}</span> : <span className="text-muted-foreground">—</span>}
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
