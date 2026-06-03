import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, useConfirm } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { VEHICLE_BRANDS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Cog, Disc, Zap, CircleDot, BatteryCharging, Filter, Droplet, Car, Wrench, Tags } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";

const ICONS: Record<string, any> = {
  "Dvigatel": Cog, "Tormoz tizimi": Disc, "Elektr": Zap, "Shinalar": CircleDot,
  "Akkumulyator": BatteryCharging, "Filtrlar": Filter, "Moy": Droplet, "Kuzov qismlari": Car, "Podveska": Wrench,
};

export const Route = createFileRoute("/_app/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const t = useT();
  const { products, categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const submit = () => {
    const n = name.trim();
    if (!n) { toast.error(t("categories.nameRequired")); return; }
    if (editing) {
      if (n !== editing && categories.includes(n)) { toast.error(t("toast.alreadyExists")); return; }
      updateCategory(editing, n);
      toast.success(t("toast.updated"));
    } else {
      if (categories.includes(n)) { toast.error(t("toast.alreadyExists")); return; }
      addCategory(n);
      toast.success(t("categories.added"));
    }
    setOpen(false); setEditing(null); setName("");
  };

  const remove = async (c: string) => {
    const count = products.filter(p => p.category === c).length;
    const desc = count > 0
      ? t("categories.deleteWithProducts", { n: count })
      : t("categories.deleteSimple", { name: c });
    const ok = await confirm({ title: t("common.delete"), description: desc, destructive: true, confirmText: t("common.delete") });
    if (!ok) return;
    deleteCategory(c);
    toast.success(t("toast.deleted"));
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader title={t("categories.title")} subtitle={t("categories.subtitle")} actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setName(""); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{t("common.new")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? t("categories.edit") : t("categories.new")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("common.name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("categories.examplePh")} autoFocus /></div>
            </div>
            <DialogFooter><Button onClick={submit}>{t("common.save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map(c => {
          const Icon = ICONS[c] || Tags;
          const count = products.filter(p => p.category === c).length;
          return (
            <Card key={c} className="p-5 rounded-2xl hover:shadow-elevated transition group relative">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{c}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t("categories.productCount", { n: count })}</div>
              <div className="flex flex-wrap gap-1 mt-3">
                {VEHICLE_BRANDS.slice(0, 4).map(b => <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>)}
              </div>
              <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c); setName(c); setOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead className="text-right">{t("common.productCount")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {categories.map(c => (
                <TableRow key={c} className="hover:bg-muted/40">
                  <TableCell className="font-medium">{c}</TableCell>
                  <TableCell className="text-right tabular-nums">{products.filter(p => p.category === c).length}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setName(c); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
