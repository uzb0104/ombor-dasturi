import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { getCategoryMeta } from "./category-meta";

interface CategoryCardProps {
  category: string;
  productCount: number;
  onEdit: (cat: string) => void;
  onDelete: (cat: string) => void;
}

export function CategoryCard({ category, productCount, onEdit, onDelete }: CategoryCardProps) {
  const t = useT();
  const { Icon, theme } = getCategoryMeta(category);

  return (
    <Card className="group relative flex flex-col justify-between p-3 rounded-2xl bg-card hover:bg-muted/30 border border-border/70 hover:border-primary/40 transition-colors shadow-none hover:shadow-none min-h-[114px] cursor-default">
      {/* Header row: Icon & Count Badge */}
      <div className="flex items-start justify-between gap-1">
        <div
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${theme.bg} ${theme.text} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-4 w-4" />
        </div>

        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
            productCount > 0
              ? "bg-muted text-foreground/80"
              : "bg-muted/50 text-muted-foreground/60"
          }`}
        >
          {productCount}
        </span>
      </div>

      {/* Body: Category name & count */}
      <div className="mt-2.5">
        <div
          className="font-bold text-xs text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors"
          title={category}
        >
          {category}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
          {productCount} ta tovar
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
            onEdit(category);
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
            onDelete(category);
          }}
          title={t("common.delete")}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
