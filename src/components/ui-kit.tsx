import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, accent = "primary", hint,
}: {
  label: string; value: string; icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  hint?: string;
}) {
  const accentBg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/15 text-info",
  }[accent];
  return (
    <Card className="card-elevated rounded-2xl border-border/60 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${accentBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ qty, min }: { qty: number; min: number }) {
  let label = "Yetarli", cls = "bg-success/15 text-success border-success/30";
  if (qty === 0) { label = "Tugagan"; cls = "bg-muted text-muted-foreground border-border"; }
  else if (qty <= min) { label = "Kam"; cls = "bg-destructive/10 text-destructive border-destructive/30"; }
  else if (qty <= min * 2) { label = "O'rta"; cls = "bg-warning/20 text-warning-foreground border-warning/40"; }
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}
