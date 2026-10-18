import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirm } from "@/components/ui-kit";
import { ROLES, PERMISSION_MODULES, ALL_PERMISSIONS } from "@/lib/constants";
import { useT } from "@/lib/i18n";
import { roleLabel } from "@/lib/i18n/helpers";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { AppUser } from "@/lib/types";

type UserForm = Omit<AppUser, "id">;
const emptyUser = (): UserForm => ({
  name: "",
  email: "",
  password: "",
  role: "Sotuvchi",
  permissions: [],
  active: true,
});

interface UsersManagementProps {
  appUsers: AppUser[];
  add: (u: Omit<AppUser, "id">) => void;
  update: (id: string, u: Partial<AppUser>) => void;
  remove: (id: string) => void;
}

export function UsersManagement({ appUsers, add, update, remove }: UsersManagementProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUser());
  const [showUserPass, setShowUserPass] = useState(false);
  const { confirm, confirmNode } = useConfirm();

  const removeUser = async (u: AppUser) => {
    const ok = await confirm({
      title: t("settings.deleteUser"),
      description: t("common.deleteQuestion", { name: u.name }),
      destructive: true,
      confirmText: t("common.delete"),
    });
    if (ok) {
      remove(u.id);
      toast.success(t("toast.deleted"));
    }
  };

  const startEdit = (u: AppUser) => {
    setEditing(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      permissions: u.permissions,
      active: u.active,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error(t("settings.emailNameRequired"));
      return;
    }
    if (!editing && !(form.password || "").trim()) {
      toast.error(t("toast.passwordRequired"));
      return;
    }
    if (!editing && appUsers.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
      toast.error(t("toast.emailExists"));
      return;
    }
    const data: UserForm = {
      ...form,
      permissions: form.role === "Admin" ? ALL_PERMISSIONS : form.permissions,
    };
    if (editing) {
      update(editing, data);
      toast.success(t("toast.updated"));
    } else {
      add(data);
      toast.success(t("settings.userAdded"));
    }
    setOpen(false);
    setEditing(null);
    setForm(emptyUser());
  };

  const togglePerm = (path: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(path)
        ? f.permissions.filter((p: string) => p !== path)
        : [...f.permissions, path],
    }));
  };

  return (
    <Card className="rounded-2xl">
      {confirmNode}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{t("settings.usersTitle")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("settings.usersDesc")}</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditing(null);
              setForm(emptyUser());
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              {t("settings.newUser")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? t("settings.editUser") : t("settings.newUser")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("crm.name")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t("common.email")} *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    disabled={!!editing}
                  />
                </div>
                <div>
                  <Label>
                    {t("common.password")} {editing && t("settings.passwordHint")}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showUserPass ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPass(!showUserPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showUserPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>{t("common.role")}</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as UserForm["role"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabel(t, r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">{t("settings.active")}</div>
                  <div className="text-xs text-muted-foreground">{t("settings.activeHint")}</div>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{t("settings.modulePerms")}</Label>
                  {form.role === "Admin" ? (
                    <Badge variant="secondary">{t("settings.adminAllPerms")}</Badge>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          permissions:
                            f.permissions.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS,
                        }))
                      }
                    >
                      {form.permissions.length === ALL_PERMISSIONS.length
                        ? t("settings.clearAllPerms")
                        : t("settings.selectAllPerms")}
                    </button>
                  )}
                </div>
                <div
                  className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${
                    form.role === "Admin" ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {PERMISSION_MODULES.map((m) => (
                    <label
                      key={m.path}
                      className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={form.permissions.includes(m.path)}
                        onCheckedChange={() => togglePerm(m.path)}
                      />
                      <span className="truncate">{t(m.labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.user")}</TableHead>
              <TableHead>{t("common.email")}</TableHead>
              <TableHead>{t("common.role")}</TableHead>
              <TableHead>{t("settings.permissions")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm font-mono">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "Admin" ? "default" : "secondary"}>
                    {roleLabel(t, u.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.role === "Admin"
                    ? t("settings.permsAll")
                    : t("settings.permsCount", {
                        n: u.permissions.length,
                        total: ALL_PERMISSIONS.length,
                      })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={u.active ? "secondary" : "outline"}
                    className={u.active ? "text-success" : "text-muted-foreground"}
                  >
                    {u.active ? t("employees.active") : t("employees.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(u)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={u.id === "u_admin"}
                    onClick={() => removeUser(u)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
