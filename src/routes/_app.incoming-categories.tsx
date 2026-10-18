import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, useConfirm } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  MapPin,
  TrendingUp,
  Package,
  Layers,
  ExternalLink,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useT, useLang } from "@/lib/i18n";
import { formatSom } from "@/lib/constants";

export const Route = createFileRoute("/_app/incoming-categories")({
  component: IncomingCategoriesPage,
});

function IncomingCategoriesPage() {
  const t = useT();
  const { lang } = useLang();
  const navigate = useNavigate();
  const isRu = lang === "ru";

  const {
    incomingCategories,
    incoming,
    addIncomingCategory,
    updateIncomingCategory,
    deleteIncomingCategory,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const sortedCategories = useMemo(
    () => [...incomingCategories].sort((a, b) => a.localeCompare(b, "uz", { sensitivity: "base" })),
    [incomingCategories],
  );

  // Region stats calculation from existing incoming records
  const regionStats = useMemo(() => {
    const stats: Record<string, { count: number; totalCost: number; uniqueProducts: Set<string> }> =
      {};
    incomingCategories.forEach((cat) => {
      stats[cat] = { count: 0, totalCost: 0, uniqueProducts: new Set() };
    });

    incoming.forEach((item) => {
      if (item.region && stats[item.region]) {
        stats[item.region].count += 1;
        stats[item.region].totalCost += (item.qty || 0) * (item.buyPrice || 0);
        stats[item.region].uniqueProducts.add(item.productId);
      }
    });

    return stats;
  }, [incomingCategories, incoming]);

  const totalSpentAcrossAll = useMemo(
    () => incoming.reduce((sum, item) => sum + (item.qty || 0) * (item.buyPrice || 0), 0),
    [incoming],
  );

  const submit = () => {
    const n = name.trim();
    if (!n) {
      toast.error(isRu ? "Введите название категории" : "Kategoriya nomi kiritilishi shart");
      return;
    }
    if (editing) {
      if (n !== editing && incomingCategories.includes(n)) {
        toast.error(isRu ? "Эта категория уже существует" : "Bu kategoriya allaqachon mavjud");
        return;
      }
      updateIncomingCategory(editing, n);
      toast.success(isRu ? "Категория обновлена в базе" : "Kategoriya bazada yangilandi");
    } else {
      if (incomingCategories.includes(n)) {
        toast.error(isRu ? "Эта категория уже существует" : "Bu kategoriya allaqachon mavjud");
        return;
      }
      addIncomingCategory(n);
      toast.success(isRu ? "Новая категория сохранена в базу" : "Yangi kategoriya bazaga saqlandi");
    }
    setOpen(false);
    setEditing(null);
    setName("");
  };

  const remove = async (c: string) => {
    const usageCount = regionStats[c]?.count || 0;
    const ok = await confirm({
      title: isRu ? "Удаление категории" : "Kategoriyani o'chirish",
      description:
        usageCount > 0
          ? isRu
            ? `Внимание! С категорией "${c}" связано ${usageCount} поступлений. Вы уверены, что хотите удалить её из базы?`
            : `Diqqat! "${c}" kategoriyasiga tegishli ${usageCount} ta kirim mavjud. Uni bazadan o'chirishni tasdiqlaysizmi?`
          : isRu
            ? `Удалить категорию "${c}" из базы?`
            : `"${c}" kirim kategoriyasini bazadan o'chirishni tasdiqlaysizmi?`,
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    deleteIncomingCategory(c);
    toast.success(t("toast.deleted"));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {confirmNode}

      <PageHeader
        title={isRu ? "Категории прихода (Регионы)" : "Kirim kategoriyalari (Viloyatlar)"}
        subtitle={
          isRu
            ? `Управление категориями и регионами поставок из базы данных (${incomingCategories.length} шт)`
            : `Bazadagi kirim toifalari va ta'minot viloyatlari boshqaruvi (${incomingCategories.length} ta kategoriya)`
        }
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
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {isRu ? "Добавить категорию" : "Yangi kategoriya"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editing
                    ? isRu
                      ? "Редактировать категорию"
                      : "Kategoriyani tahrirlash"
                    : isRu
                      ? "Новая категория прихода"
                      : "Yangi kirim kategoriyasi"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs font-semibold">
                    {isRu ? "Название категории / региона" : "Kategoriya yoki viloyat nomi"} *
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      isRu
                        ? "Например: Андижан, Ташкент, Завод..."
                        : "Masalan: Andijon, Toshkent, Zavod..."
                    }
                    className="mt-1.5"
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {isRu
                      ? "Категория будет сохранена в базу данных и станет доступна при оформлении прихода."
                      : "Ushbu kategoriya bazaga saqlanadi va kirim qilishda tanlash uchun chiqadi."}
                  </p>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button onClick={submit}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl bg-card border-border/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {isRu ? "Категорий в базе" : "Bazadagi kategoriyalar"}
            </div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {incomingCategories.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {isRu ? "кат." : "ta"}
              </span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <MapPin className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {isRu ? "Всего поступлений" : "Jami kirim partiyalari"}
            </div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {incoming.length}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {isRu ? "партий" : "partiya"}
              </span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 grid place-items-center">
            <Package className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border-border/60 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {isRu ? "Сумма закупок" : "Kirim qilingan jami summa"}
            </div>
            <div className="text-xl font-bold mt-1 text-foreground truncate max-w-[200px]">
              {formatSom(totalSpentAcrossAll)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {sortedCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-12 text-center bg-card">
          <Layers className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <div className="font-semibold text-foreground text-base">
            {isRu
              ? "Категории прихода ещё не созданы"
              : "Hozircha kirim kategoriyalari mavjud emas"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 mb-5 max-w-md mx-auto">
            {isRu
              ? "Создайте нужные категории или регионы поставок (например: Андижан, Ташкент, Навои или Завод). Они сохранятся в базе данных."
              : "O'zingizga kerakli kirim toifalari yoki viloyatlarni yarating (masalan: Andijon, Toshkent, Navoiy). Ular bazaga saqlanadi."}
          </div>
          <Button onClick={() => setOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            {isRu ? "Добавить первую категорию" : "Birinchi kategoriyani qo'shish"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedCategories.map((c: string) => {
            const stats = regionStats[c] || { count: 0, totalCost: 0, uniqueProducts: new Set() };
            const hasActivity = stats.count > 0;

            return (
              <Card
                key={c}
                className="p-4 rounded-2xl hover:shadow-elevated transition group relative bg-card border-border/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary font-semibold">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-base leading-tight">
                          {c}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {isRu ? "Категория прихода" : "Kirim toifasi"}
                        </div>
                      </div>
                    </div>

                    <div className="flex opacity-80 group-hover:opacity-100 transition">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditing(c);
                          setName(c);
                          setOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-2 border-t border-b border-border/40 text-xs">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>{isRu ? "Поставок партии:" : "Kirim partiyalari:"}</span>
                      <Badge
                        variant={hasActivity ? "secondary" : "outline"}
                        className="text-xs px-1.5 py-0"
                      >
                        {stats.count} {isRu ? "шт" : "ta"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>{isRu ? "Товаров:" : "Turli tovarlar:"}</span>
                      <span className="font-medium text-foreground">
                        {stats.uniqueProducts.size} {isRu ? "вид." : "tur"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>{isRu ? "Всего закупка:" : "Jami xarid:"}</span>
                      <span className="font-semibold text-foreground">
                        {formatSom(stats.totalCost)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-primary hover:text-primary hover:bg-primary/10 justify-between h-8"
                    onClick={() => {
                      navigate({
                        to: "/incoming",
                        search: { region: c },
                      });
                    }}
                  >
                    <span>{isRu ? "Посмотреть поступления" : "Kirimlarini ko'rish"}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
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
