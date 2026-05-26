import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { useState, useMemo, useCallback, useRef } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, accent = "primary", hint, onClick,
}: {
  label: string; value: string; icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive" | "info";
  hint?: string;
  onClick?: () => void;
}) {
  const accentBg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/15 text-info",
  }[accent];
  return (
    <Card
      className={`card-elevated rounded-2xl border-border/60 overflow-hidden ${onClick ? "cursor-pointer hover:border-primary/40 hover:shadow-md transition" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
            {onClick && <div className="text-[10px] text-primary mt-1 font-medium">Batafsil →</div>}
          </div>
          <div className={`grid h-11 w-11 place-items-center rounded-xl shrink-0 ${accentBg}`}>
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
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
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

// ─────────────── Confirm dialog hook ───────────────
type ConfirmOpts = { title?: string; description?: string; confirmText?: string; cancelText?: string; destructive?: boolean };

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOpts & { open: boolean }) | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOpts = {}) => {
    setState({ ...opts, open: true });
    return new Promise<boolean>((res) => { resolver.current = res; });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setState((s) => s ? { ...s, open: false } : s);
  };

  const node = (
    <AlertDialog open={!!state?.open} onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title || "Tasdiqlash"}</AlertDialogTitle>
          {state?.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{state?.cancelText || "Bekor qilish"}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={state?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {state?.confirmText || "Tasdiqlash"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmNode: node };
}

// ─────────────── Pagination hook ───────────────
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(() => items.slice((safePage - 1) * pageSize, safePage * pageSize), [items, safePage, pageSize]);
  // reset to 1 if filter changes shrink list
  if (page !== safePage) setTimeout(() => setPage(safePage), 0);
  return { paged, page: safePage, setPage, totalPages, totalItems: items.length, pageSize };
}

export function PaginationBar({ page, setPage, totalPages, totalItems, pageSize }: {
  page: number; setPage: (n: number) => void; totalPages: number; totalItems: number; pageSize: number;
}) {
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 border-t flex-wrap">
      <div className="text-xs text-muted-foreground">{start}–{end} / {totalItems}</div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs font-medium px-2 tabular-nums">{page} / {totalPages}</div>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─────────────── Selection hook ───────────────
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids: string[], checked: boolean) => setSelected(s => {
    const n = new Set(s);
    if (checked) ids.forEach(i => n.add(i)); else ids.forEach(i => n.delete(i));
    return n;
  });
  const clear = () => setSelected(new Set());
  const has = (id: string) => selected.has(id);
  return { selected, toggle, toggleAll, clear, has, count: selected.size };
}

export function BulkBar({ count, onDelete, onClear, label = "tanlandi" }: {
  count: number; onDelete: () => void; onClear: () => void; label?: string;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 mb-3">
      <div className="text-sm font-medium">{count} ta {label}</div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>Bekor qilish</Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-1" />Tanlanganlarni o'chirish
        </Button>
      </div>
    </div>
  );
}

export function SelectCell({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} aria-label="Tanlash" />;
}
