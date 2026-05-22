import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { formatSom } from "@/lib/constants";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/debts")({ component: DebtsPage });

function DebtsPage() {
  const { customers, suppliers } = useStore();
  const fromCustomers = customers.filter(c => c.debt > 0);
  const toSuppliers = suppliers.filter(s => s.debt > 0);
  const totalIn = fromCustomers.reduce((a,c) => a + c.debt, 0);
  const totalOut = toSuppliers.reduce((a,s) => a + s.debt, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Qarzdorlik" subtitle="Kimdan olinadi va kimga beriladi" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="Bizga qarzdor" value={formatSom(totalIn)} icon={ArrowDownCircle} accent="success" />
        <StatCard label="Biz qarzdormiz" value={formatSom(totalOut)} icon={ArrowUpCircle} accent="destructive" />
      </div>

      <Tabs defaultValue="in">
        <TabsList>
          <TabsTrigger value="in">Kimdan olinadi ({fromCustomers.length})</TabsTrigger>
          <TabsTrigger value="out">Kimga beriladi ({toSuppliers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="in">
          <Card className="rounded-2xl">
            <Table>
              <TableHeader><TableRow><TableHead>Mijoz</TableHead><TableHead>Telefon</TableHead><TableHead className="text-right">Qarz</TableHead></TableRow></TableHeader>
              <TableBody>
                {fromCustomers.map(c => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.phone}</TableCell>
                    <TableCell className="text-right text-destructive font-semibold tabular-nums">{formatSom(c.debt)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="out">
          <Card className="rounded-2xl">
            <Table>
              <TableHeader><TableRow><TableHead>Yetkazib beruvchi</TableHead><TableHead>Telefon</TableHead><TableHead className="text-right">Qarz</TableHead></TableRow></TableHeader>
              <TableBody>
                {toSuppliers.map(s => (
                  <TableRow key={s.id}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.phone}</TableCell>
                    <TableCell className="text-right text-destructive font-semibold tabular-nums">{formatSom(s.debt)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
