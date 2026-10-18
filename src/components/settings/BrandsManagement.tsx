import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui-kit";
import { useT } from "@/lib/i18n";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

interface BrandsManagementProps {
  brands: string[];
  products: Product[];
  add: (b: string) => void;
  update: (oldName: string, newName: string) => void;
  remove: (b: string) => void;
}

export function BrandsManagement({ brands, products, add, update, remove }: BrandsManagementProps) {
  const t = useT();
  const [newBrand, setNewBrand] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const addBrand = () => {
    const n = newBrand.trim();
    if (!n) {
      toast.error(t("settings.brandNameRequired"));
      return;
    }
    if (brands.includes(n)) {
      toast.error(t("settings.brandExists"));
      return;
    }
    add(n);
    setNewBrand("");
    toast.success(t("settings.brandAdded"));
  };

  const saveEdit = (oldName: string) => {
    const n = editValue.trim();
    if (!n) return;
    if (n !== oldName && brands.includes(n)) {
      toast.error(t("settings.brandExists"));
      return;
    }
    update(oldName, n);
    setEditing(null);
    toast.success(t("toast.updated"));
  };

  const removeBrand = async (b: string) => {
    const count = products.filter(
      (p) =>
        p.vehicle === b ||
        (p.vehicles && p.vehicles.includes(b)) ||
        (p.vehicle && p.vehicle.includes(b)),
    ).length;
    const desc =
      count > 0
        ? t("settings.brandDeleteLinked", { name: b, n: count })
        : t("settings.brandDelete", { name: b });
    const ok = await confirm({
      title: t("settings.deleteBrand"),
      description: desc,
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (!ok) return;
    remove(b);
    toast.success(t("toast.deleted"));
  };

  return (
    <Card className="rounded-2xl">
      {confirmNode}
      <div className="p-4 border-b">
        <h3 className="font-semibold">{t("settings.brands")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("settings.brandsDesc")}</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-lg">
          <Input
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            placeholder={t("settings.brandPh")}
            onKeyDown={(e) => e.key === "Enter" && addBrand()}
          />
          <Button onClick={addBrand}>
            <Plus className="h-4 w-4 mr-1" />
            {t("common.add")}
          </Button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {brands.map((b) => {
          const count = products.filter(
            (p) =>
              p.vehicle === b ||
              (p.vehicles && p.vehicles.includes(b)) ||
              (p.vehicle && p.vehicle.includes(b)),
          ).length;
          const isEditing = editing === b;
          return (
            <div key={b} className="flex items-center gap-2 rounded-lg border p-2 bg-card">
              {isEditing ? (
                <>
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(b)}
                    className="h-8"
                  />
                  <Button size="sm" onClick={() => saveEdit(b)}>
                    OK
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    X
                  </Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{b}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("categories.productCount", { n: count })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(b);
                      setEditValue(b);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeBrand(b)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
