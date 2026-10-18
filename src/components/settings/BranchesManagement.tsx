import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/ui-kit";
import { useT } from "@/lib/i18n";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BranchesManagementProps {
  branches: string[];
  add: (b: string) => void;
  update: (oldName: string, newName: string) => void;
  remove: (b: string) => void;
}

export function BranchesManagement({ branches, add, update, remove }: BranchesManagementProps) {
  const t = useT();
  const [newBranch, setNewBranch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const addBranchFn = () => {
    const n = newBranch.trim();
    if (!n) {
      toast.error(t("settings.branchNameRequired"));
      return;
    }
    if (branches.includes(n)) {
      toast.error(t("settings.branchExists"));
      return;
    }
    add(n);
    setNewBranch("");
    toast.success(t("settings.branchAdded"));
  };

  const saveEdit = (oldName: string) => {
    const n = editValue.trim();
    if (!n) return;
    if (n !== oldName && branches.includes(n)) {
      toast.error(t("settings.branchExists"));
      return;
    }
    update(oldName, n);
    setEditing(null);
    toast.success(t("toast.updated"));
  };

  const removeBranch = async (b: string) => {
    if (branches.length <= 1) {
      toast.error(t("settings.branchMin"));
      return;
    }
    const ok = await confirm({
      title: t("settings.deleteBranch"),
      description: t("settings.branchDelete", { name: b }),
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
        <h3 className="font-semibold">{t("settings.branchesTitle")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("settings.branchesDesc")}</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-lg">
          <Input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            placeholder={t("settings.branchPh")}
            onKeyDown={(e) => e.key === "Enter" && addBranchFn()}
          />
          <Button onClick={addBranchFn}>
            <Plus className="h-4 w-4 mr-1" />
            {t("common.add")}
          </Button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {branches.map((b) => {
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
                  <div className="flex-1 min-w-0 font-medium text-sm truncate">{b}</div>
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
                  <Button variant="ghost" size="icon" onClick={() => removeBranch(b)}>
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
