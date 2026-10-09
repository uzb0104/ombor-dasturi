import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, useConfirm } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Tags,
  Truck,
  PackagePlus,
  Building2,
  Globe,
  Boxes,
  Layers,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

const ICONS: Record<string, React.ElementType> = {
  "Import (Xitoy)": Globe,
  "Mahalliy ta'minot": Truck,
  "To'g'ridan-to'g'ri zavod": Building2,
  "Shoshilinch buyurtma": PackagePlus,
};

export const Route = createFileRoute("/_app/incoming-categories")({
  component: IncomingCategoriesPage,
});

function IncomingCategoriesPage() {
  const t = useT();
  const {
    incomingCategories,
    addIncomingCategory,
    updateIncomingCategory,
    deleteIncomingCategory,
  } = useStore();
  const sortedCategories = useMemo(
    () => [...incomingCategories].sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    [incomingCategories],
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const submit = () => {
    const n = name.trim();
    if (!n) {
      toast.error("Kategoriya nomi kiritilishi shart");
      return;
    }
    if (editing) {
      if (n !== editing && incomingCategories.includes(n)) {
        toast.error("Bu kategoriya allaqachon mavjud");
        return;
      }
      updateIncomingCategory(editing, n);
      toast.success("Kategoriya yangilandi");
    } else {
      if (incomingCategories.includes(n)) {
        toast.error("Bu kategoriya allaqachon mavjud");
        return;
      }
      addIncomingCategory(n);
      toast.success("Yangi kirim kategoriyasi qo'shildi");
    }
    setOpen(false);
    setEditing(null);
    setName("");
  };

  const remove = async (c: string) => {
    const ok = await confirm({
      title: "Kategoriyani o'chirish",
      description: `"${c}" kirim kategoriyasini o'chirishni tasdiqlaysizmi?`,
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    deleteIncomingCategory(c);
    toast.success(t("toast.deleted"));
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader
        title="Kirim kategoriyalari"
        subtitle={`${incomingCategories.length} ta kirim toifasi mavjud`}
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditing(null);
                setName("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                {t("common.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Kirim kategoriyasini tahrirlash" : "Yangi kirim kategoriyasi"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Kategoriya nomi</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Zavoddan to'g'ridan-to'g'ri"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {sortedCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <div className="font-semibold text-foreground">
            Hozircha kirim kategoriyalari mavjud emas
          </div>
          <div className="text-xs text-muted-foreground mt-1 mb-4">
            Bazada yangi kirim toifalarini yaratish uchun "+ Yangi" tugmasini bosing
          </div>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Kategoriya qo'shish
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedCategories.map((c: string) => {
            const Icon = ICONS[c] || Layers;
            return (
              <Card
                key={c}
                className="p-4 rounded-2xl hover:shadow-elevated transition group relative bg-card border-border/60"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary mb-2">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-foreground text-sm">{c}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Kirim toifasi</div>
                <div className="absolute top-2 right-2 flex opacity-0 group-hover:opacity-100 transition">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditing(c);
                      setName(c);
                      setOpen(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
