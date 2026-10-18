import { useState, useMemo } from "react";
import { PageHeader, useConfirm } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, Package } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { CategoryCard } from "./CategoryCard";
import { CategoryFormDialog } from "./CategoryFormDialog";

export function CategoriesPage() {
  const t = useT();
  const { products, categories, addCategory, updateCategory, deleteCategory } = useStore();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    [categories],
  );

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedCategories;
    return sortedCategories.filter((c) => c.toLowerCase().includes(q));
  }, [sortedCategories, search]);

  const submit = () => {
    const n = name.trim();
    if (!n) {
      toast.error(t("categories.nameRequired"));
      return;
    }
    if (editing) {
      if (n !== editing && categories.includes(n)) {
        toast.error(t("toast.alreadyExists"));
        return;
      }
      updateCategory(editing, n);
      toast.success(t("toast.updated"));
    } else {
      if (categories.includes(n)) {
        toast.error(t("toast.alreadyExists"));
        return;
      }
      addCategory(n);
      toast.success(t("categories.added"));
    }
    setOpen(false);
    setEditing(null);
    setName("");
  };

  const remove = async (c: string) => {
    const count = products.filter((p) => p.category === c).length;
    const desc =
      count > 0
        ? t("categories.deleteWithProducts", { n: count })
        : t("categories.deleteSimple", { name: c });
    const ok = await confirm({
      title: t("common.delete"),
      description: desc,
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    deleteCategory(c);
    toast.success(t("toast.deleted"));
  };

  const handleStartEdit = (cat: string) => {
    setEditing(cat);
    setName(cat);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      {confirmNode}
      <PageHeader
        title={t("categories.title")}
        subtitle={t("categories.subtitle")}
        actions={
          <Button
            className="shadow-xs"
            onClick={() => {
              setEditing(null);
              setName("");
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t("common.new")}
          </Button>
        }
      />

      {/* Toolbar: Search input + Stats pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-sm border border-border/70 p-2.5 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kategoriyalarni qidirish..."
            className="pl-9 pr-8 h-9 text-xs bg-background/80 border-border/60 focus:bg-background"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              aria-label="Tozalash"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-muted/80 text-muted-foreground font-medium">
            Jami: <span className="font-semibold text-foreground">{categories.length}</span> ta
            kategoriya
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">
            <span className="font-semibold">{products.length}</span> ta tovar
          </div>
        </div>
      </div>

      {/* Categories Grid - 10 columns on desktop */}
      {filteredCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center bg-card/40">
          <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <div className="font-semibold text-foreground text-sm">
            Hech qanday kategoriya topilmadi
          </div>
          <div className="text-xs text-muted-foreground mt-1 mb-3">
            "{search}" so'rovi bo'yicha kategoriya mavjud emas
          </div>
          <Button variant="outline" size="sm" onClick={() => setSearch("")}>
            Qidiruvni tozalash
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
          {filteredCategories.map((c: string) => {
            const count = products.filter((p) => p.category === c).length;
            return (
              <CategoryCard
                key={c}
                category={c}
                productCount={count}
                onEdit={handleStartEdit}
                onDelete={remove}
              />
            );
          })}
        </div>
      )}

      <CategoryFormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setName("");
          }
        }}
        editing={editing}
        name={name}
        setName={setName}
        onSubmit={submit}
      />
    </div>
  );
}
