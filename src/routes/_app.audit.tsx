import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, usePagination, PaginationBar } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Search, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/audit")({ component: AuditPage });

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  create: { label: "Yaratdi", color: "bg-success/15 text-success" },
  update: { label: "Yangiladi", color: "bg-primary/15 text-primary" },
  delete: { label: "O'chirdi", color: "bg-destructive/15 text-destructive" },
  login: { label: "Kirdi", color: "bg-muted text-foreground" },
  logout: { label: "Chiqdi", color: "bg-muted text-foreground" },
};

function AuditPage() {
  const { auditLog, clearAudit, user, appUsers } = useStore();
  const [q, setQ] = useState("");
  const [actionF, setActionF] = useState("all");
  const [userF, setUserF] = useState("all");

  const isAdmin = user?.role === "Admin";

  const filtered = useMemo(() => auditLog.filter(e => {
    if (actionF !== "all" && e.action !== actionF) return false;
    if (userF !== "all" && e.userId !== userF) return false;
    if (q && !e.summary.toLowerCase().includes(q.toLowerCase()) && !e.userName.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [auditLog, q, actionF, userF]);

  const pg = usePagination(filtered, 20);

  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <PageHeader title="Audit jurnali" subtitle="Faqat adminlar uchun" />
        <Card className="p-10 rounded-2xl text-center text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
          Bu bo'lim faqat Admin uchun.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit jurnali"
        subtitle={`Tizimdagi barcha amallar tarixi — ${auditLog.length} ta yozuv`}
        actions={
          <Button variant="outline" onClick={() => {
            if (confirm("Audit jurnalini tozalashga ishonchingiz komilmi?")) { clearAudit(); toast.success("Tozalandi"); }
          }}>
            <Trash2 className="h-4 w-4 mr-1" />Tozalash
          </Button>
        }
      />

      <Card className="p-3 md:p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Qidirish..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={actionF} onValueChange={setActionF}>
            <SelectTrigger className="sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha amallar</SelectItem>
              <SelectItem value="create">Yaratish</SelectItem>
              <SelectItem value="update">Yangilash</SelectItem>
              <SelectItem value="delete">O'chirish</SelectItem>
              <SelectItem value="login">Kirish</SelectItem>
              <SelectItem value="logout">Chiqish</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userF} onValueChange={setUserF}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha xodimlar</SelectItem>
              {appUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaqt</TableHead>
                <TableHead>Foydalanuvchi</TableHead>
                <TableHead>Amal</TableHead>
                <TableHead>Bo'lim</TableHead>
                <TableHead>Tafsilot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Yozuvlar topilmadi</TableCell></TableRow>
              )}
              {pg.paged.map(e => {
                const a = ACTION_LABEL[e.action] || { label: e.action, color: "" };
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {new Date(e.ts).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{e.userName}</TableCell>
                    <TableCell><Badge className={a.color} variant="outline">{a.label}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{e.entity}</TableCell>
                    <TableCell className="text-sm">{e.summary}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <PaginationBar {...pg} />
      </Card>
    </div>
  );
}
