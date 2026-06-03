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
import { useT } from "@/lib/i18n";
import { auditActionLabel } from "@/lib/i18n/helpers";

export const Route = createFileRoute("/_app/audit")({ component: AuditPage });

const ACTION_COLOR: Record<string, string> = {
  create: "bg-success/15 text-success",
  update: "bg-primary/15 text-primary",
  delete: "bg-destructive/15 text-destructive",
  login: "bg-muted text-foreground",
  logout: "bg-muted text-foreground",
};

function AuditPage() {
  const t = useT();
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
        <PageHeader title={t("audit.title")} subtitle={t("audit.adminOnly")} />
        <Card className="p-10 rounded-2xl text-center text-muted-foreground">
          <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
          {t("audit.adminOnlyCard")}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("audit.title")}
        subtitle={t("audit.subtitle", { n: auditLog.length })}
        actions={
          <Button variant="outline" onClick={() => {
            if (confirm(t("audit.clearConfirm"))) { clearAudit(); toast.success(t("toast.cleared")); }
          }}>
            <Trash2 className="h-4 w-4 mr-1" />{t("audit.clear")}
          </Button>
        }
      />

      <Card className="p-3 md:p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={t("common.search")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={actionF} onValueChange={setActionF}>
            <SelectTrigger className="sm:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.filter.allActions")}</SelectItem>
              <SelectItem value="create">{t("audit.filter.create")}</SelectItem>
              <SelectItem value="update">{t("audit.filter.update")}</SelectItem>
              <SelectItem value="delete">{t("audit.filter.delete")}</SelectItem>
              <SelectItem value="login">{t("audit.filter.login")}</SelectItem>
              <SelectItem value="logout">{t("audit.filter.logout")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userF} onValueChange={setUserF}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("audit.filter.allUsers")}</SelectItem>
              {appUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.time")}</TableHead>
                <TableHead>{t("audit.user")}</TableHead>
                <TableHead>{t("audit.action")}</TableHead>
                <TableHead>{t("audit.section")}</TableHead>
                <TableHead>{t("audit.summary")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pg.paged.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t("audit.notFound")}</TableCell></TableRow>
              )}
              {pg.paged.map(e => {
                const color = ACTION_COLOR[e.action] || "";
                return (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {new Date(e.ts).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{e.userName}</TableCell>
                    <TableCell><Badge className={color} variant="outline">{auditActionLabel(t, e.action)}</Badge></TableCell>
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
