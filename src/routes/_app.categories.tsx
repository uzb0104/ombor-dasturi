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
  Search,
  X,
  Cog,
  Disc,
  Zap,
  CircleDot,
  BatteryCharging,
  Filter,
  Droplet,
  Car,
  Wrench,
  Fuel,
  Cpu,
  Fan,
  Lightbulb,
  Layers,
  Boxes,
  Activity,
  Sliders,
  RotateCw,
  Tags,
  Package,
  Shield,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

interface CategoryTheme {
  bg: string;
  text: string;
  badge: string;
}

const THEMES: Record<string, CategoryTheme> = {
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  yellow: {
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    text: "text-yellow-600 dark:text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  violet: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  teal: {
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
    badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  cyan: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  sky: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  orange: {
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  slate: {
    bg: "bg-slate-500/10 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-400",
    badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  },
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getCategoryMeta(name: string): { Icon: React.ElementType; theme: CategoryTheme } {
  const n = name.toLowerCase().trim();

  let Icon: React.ElementType = Package;
  let themeKey = "blue";

  if (n.includes("akkumulyator") || n.includes("batarey") || n.includes("akkum")) {
    Icon = BatteryCharging;
    themeKey = "amber";
  } else if (
    n.includes("elektr") ||
    n.includes("babina") ||
    n.includes("svecha") ||
    n.includes("generator") ||
    n.includes("starter") ||
    n.includes("provod")
  ) {
    Icon = Zap;
    themeKey = "amber";
  } else if (
    n.includes("datchik") ||
    n.includes("rele") ||
    n.includes("kompyuter") ||
    n.includes("mita")
  ) {
    Icon = Cpu;
    themeKey = "cyan";
  } else if (
    n.includes("far") ||
    n.includes("chiroq") ||
    n.includes("stop") ||
    n.includes("tuman") ||
    n.includes("lampa")
  ) {
    Icon = Lightbulb;
    themeKey = "yellow";
  } else if (
    n.includes("mator") ||
    n.includes("dvigatel") ||
    n.includes("motor") ||
    n.includes("porshen") ||
    n.includes("val") ||
    n.includes("shatun") ||
    n.includes("kolenval") ||
    n.includes("galovka") ||
    n.includes("kilapin") ||
    n.includes("kladish") ||
    n.includes("kollekt")
  ) {
    Icon = Cog;
    themeKey = "blue";
  } else if (
    n.includes("tormoz") ||
    n.includes("kalotka") ||
    n.includes("aporni") ||
    n.includes("vakum")
  ) {
    Icon = Disc;
    themeKey = "rose";
  } else if (
    n.includes("baraban") ||
    n.includes("diska") ||
    n.includes("shina") ||
    n.includes("ballon") ||
    n.includes("pachenik") ||
    n.includes("podshipnik")
  ) {
    Icon = CircleDot;
    themeKey = "emerald";
  } else if (
    n.includes("amarzator") ||
    n.includes("amortizator") ||
    n.includes("podveska") ||
    n.includes("prujina") ||
    n.includes("resor") ||
    n.includes("stoyka")
  ) {
    Icon = Activity;
    themeKey = "violet";
  } else if (
    n.includes("balka") ||
    n.includes("rychag") ||
    n.includes("richag") ||
    n.includes("tyaga") ||
    n.includes("sharavoy") ||
    n.includes("napravlash")
  ) {
    Icon = Wrench;
    themeKey = "purple";
  } else if (
    n.includes("kuzov") ||
    n.includes("bamfer") ||
    n.includes("bamper") ||
    n.includes("kapot") ||
    n.includes("eshik") ||
    n.includes("krilo") ||
    n.includes("brizgavek") ||
    n.includes("jabra") ||
    n.includes("oyna") ||
    n.includes("arka")
  ) {
    Icon = Car;
    themeKey = "teal";
  } else if (
    n.includes("karopka") ||
    n.includes("uzatma") ||
    n.includes("korobka") ||
    n.includes("reduktor") ||
    n.includes("mexanizm")
  ) {
    Icon = Boxes;
    themeKey = "indigo";
  } else if (
    n.includes("kardan") ||
    n.includes("kristavina") ||
    n.includes("padvisnoy") ||
    n.includes("palavos") ||
    n.includes("bendiks") ||
    n.includes("granata") ||
    n.includes("shrus")
  ) {
    Icon = RotateCw;
    themeKey = "sky";
  } else if (n.includes("filtr") || n.includes("ochistka")) {
    Icon = Filter;
    themeKey = "teal";
  } else if (
    n.includes("benzin") ||
    n.includes("yoqilgi") ||
    n.includes("bak") ||
    n.includes("nasos")
  ) {
    Icon = Fuel;
    themeKey = "orange";
  } else if (
    n.includes("moy") ||
    n.includes("suyuqlik") ||
    n.includes("antifriz") ||
    n.includes("tosol") ||
    n.includes("bachok") ||
    n.includes("patrubka")
  ) {
    Icon = Droplet;
    themeKey = "cyan";
  } else if (
    n.includes("difezor") ||
    n.includes("ventilyator") ||
    n.includes("radiator") ||
    n.includes("pechka")
  ) {
    Icon = Fan;
    themeKey = "sky";
  } else if (
    n.includes("prklatka") ||
    n.includes("prokladka") ||
    n.includes("salnik") ||
    n.includes("rezina") ||
    n.includes("nabor")
  ) {
    Icon = Layers;
    themeKey = "emerald";
  } else if (
    n.includes("gayga") ||
    n.includes("bolt") ||
    n.includes("shayba") ||
    n.includes("samorez") ||
    n.includes("shurup")
  ) {
    Icon = Sliders;
    themeKey = "slate";
  } else if (n.includes("zashita") || n.includes("himoya") || n.includes("podkrilnik")) {
    Icon = Shield;
    themeKey = "emerald";
  } else {
    const palette = [
      "indigo",
      "emerald",
      "blue",
      "violet",
      "teal",
      "rose",
      "cyan",
      "amber",
      "orange",
      "purple",
    ];
    themeKey = palette[Math.abs(hashString(name)) % palette.length];
    Icon = Tags;
  }

  return { Icon, theme: THEMES[themeKey] || THEMES.blue };
}

export const Route = createFileRoute("/_app/categories")({ component: CategoriesPage });

function CategoriesPage() {
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

  return (
    <div className="space-y-4">
      {confirmNode}
      <PageHeader
        title={t("categories.title")}
        subtitle={t("categories.subtitle")}
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
              <Button className="shadow-xs">
                <Plus className="h-4 w-4 mr-1.5" />
                {t("common.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? t("categories.edit") : t("categories.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("common.name")}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("categories.examplePh")}
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
            const { Icon, theme } = getCategoryMeta(c);
            const count = products.filter((p) => p.category === c).length;

            return (
              <Card
                key={c}
                className="group relative flex flex-col justify-between p-3 rounded-2xl bg-card hover:bg-muted/30 border border-border/70 hover:border-primary/40 transition-colors shadow-none hover:shadow-none min-h-[114px] cursor-default"
              >
                {/* Header row: Icon & Count Badge */}
                <div className="flex items-start justify-between gap-1">
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${theme.bg} ${theme.text} transition-transform duration-200 group-hover:scale-105`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      count > 0
                        ? "bg-muted text-foreground/80"
                        : "bg-muted/50 text-muted-foreground/60"
                    }`}
                  >
                    {count}
                  </span>
                </div>

                {/* Body: Category name & count */}
                <div className="mt-2.5">
                  <div
                    className="font-bold text-xs text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors"
                    title={c}
                  >
                    {c}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    {count} ta tovar
                  </div>
                </div>

                {/* Action buttons (Edit & Delete) overlay on hover */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-background/95 backdrop-blur-md rounded-lg border border-border/70 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(c);
                      setName(c);
                      setOpen(true);
                    }}
                    title={t("common.edit")}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(c);
                    }}
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-3 w-3" />
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
