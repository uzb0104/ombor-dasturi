import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, useConfirm } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore, type AppUser } from "@/lib/store";
import { ROLES, PERMISSION_MODULES, ALL_PERMISSIONS } from "@/lib/constants";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Shield, User as UserIcon, Lock, Sun, AlertTriangle, Car, Building2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { roleLabel } from "@/lib/i18n/helpers";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

type UserForm = Omit<AppUser, "id">;
const emptyUser = (): UserForm => ({
  name: "", email: "", password: "", role: "Sotuvchi",
  permissions: [], active: true,
});

function SettingsPage() {
  const t = useT();
  const { user, theme, toggleTheme, resetData, appUsers, addAppUser, updateAppUser, deleteAppUser, vehicleBrands, products, addVehicleBrand, updateVehicleBrand, deleteVehicleBrand, branches, addBranch, updateBranch, deleteBranch, updateProfile, changePassword } = useStore();
  const isAdmin = user?.role === "Admin";
  const { confirm, confirmNode } = useConfirm();

  const [profileName, setProfileName] = useState(user?.name || "");
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  const handleProfileSave = () => {
    if (!profileName.trim()) { toast.error(t("settings.nameEmpty")); return; }
    updateProfile({ name: profileName.trim() });
    toast.success(t("settings.profileUpdated"));
  };

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error(t("toast.fillAll")); return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error(t("toast.passwordMismatch")); return;
    }
    const ok = await changePassword(passwords.current, passwords.new);
    if (ok) {
      toast.success(t("settings.passwordUpdated"));
      setPasswords({ current: "", new: "", confirm: "" });
    } else {
      toast.error(t("toast.wrongPassword"));
    }
  };

  const resetAll = async () => {
    const ok = await confirm({ title: t("settings.demoResetTitle"), description: t("settings.demoResetDesc"), destructive: true, confirmText: t("settings.resetBtn") });
    if (ok) { resetData(); toast.success(t("settings.resetDone")); }
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-1.5" />{t("settings.tab.profile")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="users"><Shield className="h-4 w-4 mr-1.5" />{t("settings.tab.users")}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="brands"><Car className="h-4 w-4 mr-1.5" />{t("settings.tab.brands")}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="branches"><Building2 className="h-4 w-4 mr-1.5" />{t("settings.tab.branches")}</TabsTrigger>}
          <TabsTrigger value="security"><Lock className="h-4 w-4 mr-1.5" />{t("settings.tab.security")}</TabsTrigger>
          <TabsTrigger value="appearance"><Sun className="h-4 w-4 mr-1.5" />{t("settings.tab.appearance")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="danger" className="text-destructive"><AlertTriangle className="h-4 w-4 mr-1.5" />{t("settings.tab.danger")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">{t("settings.myProfile")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("common.name")}</Label><Input value={profileName} onChange={(e) => setProfileName(e.target.value)} /></div>
              <div><Label>{t("common.email")}</Label><Input value={user?.email} disabled /></div>
              <div><Label>{t("common.role")}</Label><Input value={user?.role ? roleLabel(t, user.role) : ""} disabled /></div>
              <div><Label>{t("settings.userId")}</Label><Input value={user?.id} disabled className="font-mono text-xs" /></div>
            </div>
            <Button onClick={handleProfileSave}>{t("common.save")}</Button>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-5">
            <UsersManagement appUsers={appUsers} add={addAppUser} update={updateAppUser} remove={deleteAppUser} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="brands" className="mt-5">
            <BrandsManagement brands={vehicleBrands} products={products} add={addVehicleBrand} update={updateVehicleBrand} remove={deleteVehicleBrand} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="branches" className="mt-5">
            <BranchesManagement branches={branches} add={addBranch} update={updateBranch} remove={deleteBranch} />
          </TabsContent>
        )}

        <TabsContent value="security" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">{t("settings.changePassword")}</h3>
            <div className="grid grid-cols-1 gap-3">
              <div><Label>{t("settings.currentPassword")}</Label><Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} /></div>
              <div><Label>{t("settings.newPassword")}</Label><Input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} /></div>
              <div><Label>{t("settings.confirmPassword")}</Label><Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} /></div>
            </div>
            <Button onClick={handlePasswordChange}>{t("common.change")}</Button>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">{t("settings.tab.appearance")}</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{t("settings.darkMode")}</div>
                <div className="text-xs text-muted-foreground">{t("settings.darkModeHint")}</div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="danger" className="mt-5">
            <Card className="p-6 rounded-2xl space-y-3 border-destructive/30 max-w-2xl">
              <h3 className="font-semibold text-destructive">{t("settings.tab.danger")}</h3>
              <p className="text-sm text-muted-foreground">{t("settings.dangerDesc")}</p>
              <Button variant="destructive" onClick={resetAll}>
                {t("settings.demoReset")}
              </Button>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function UsersManagement({
  appUsers, add, update, remove,
}: {
  appUsers: AppUser[];
  add: (u: Omit<AppUser, "id">) => void;
  update: (id: string, u: Partial<AppUser>) => void;
  remove: (id: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUser());
  const { confirm, confirmNode } = useConfirm();

  const removeUser = async (u: AppUser) => {
    const ok = await confirm({ title: t("settings.deleteUser"), description: t("common.deleteQuestion", { name: u.name }), destructive: true, confirmText: t("common.delete") });
    if (ok) { remove(u.id); toast.success(t("toast.deleted")); }
  };

  const startEdit = (u: AppUser) => {
    setEditing(u.id);
    setForm({ name: u.name, email: u.email, password: u.password, role: u.role, permissions: u.permissions, active: u.active });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error(t("settings.emailNameRequired")); return; }
    if (!editing && !form.password.trim()) { toast.error(t("toast.passwordRequired")); return; }
    if (!editing && appUsers.some(u => u.email.toLowerCase() === form.email.toLowerCase())) {
      toast.error(t("toast.emailExists")); return;
    }
    const data: UserForm = {
      ...form,
      permissions: form.role === "Admin" ? ALL_PERMISSIONS : form.permissions,
    };
    if (editing) { update(editing, data); toast.success(t("toast.updated")); }
    else { add(data); toast.success(t("settings.userAdded")); }
    setOpen(false); setEditing(null); setForm(emptyUser());
  };

  const togglePerm = (path: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(path)
        ? f.permissions.filter(p => p !== path)
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
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyUser()); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />{t("settings.newUser")}</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? t("settings.editUser") : t("settings.newUser")}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("crm.name")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>{t("common.email")} *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} /></div>
                <div><Label>{t("common.password")} {editing && t("settings.passwordHint")}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div><Label>{t("common.role")}</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{roleLabel(t, r)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">{t("settings.active")}</div>
                  <div className="text-xs text-muted-foreground">{t("settings.activeHint")}</div>
                </div>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{t("settings.modulePerms")}</Label>
                  {form.role === "Admin"
                    ? <Badge variant="secondary">{t("settings.adminAllPerms")}</Badge>
                    : <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForm(f => ({ ...f, permissions: f.permissions.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS }))}>
                        {form.permissions.length === ALL_PERMISSIONS.length ? t("settings.clearAllPerms") : t("settings.selectAllPerms")}
                      </button>
                  }
                </div>
                <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${form.role === "Admin" ? "opacity-50 pointer-events-none" : ""}`}>
                  {PERMISSION_MODULES.map(m => (
                    <label key={m.path} className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={form.permissions.includes(m.path)} onCheckedChange={() => togglePerm(m.path)} />
                      <span className="truncate">{t(m.labelKey)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={submit}>{t("common.save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>{t("common.user")}</TableHead><TableHead>{t("common.email")}</TableHead><TableHead>{t("common.role")}</TableHead>
            <TableHead>{t("settings.permissions")}</TableHead><TableHead>{t("common.status")}</TableHead>
            <TableHead className="text-right">{t("common.actions")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {appUsers.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm font-mono">{u.email}</TableCell>
                <TableCell><Badge variant={u.role === "Admin" ? "default" : "secondary"}>{roleLabel(t, u.role)}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.role === "Admin" ? t("settings.permsAll") : t("settings.permsCount", { n: u.permissions.length, total: ALL_PERMISSIONS.length })}
                </TableCell>
                <TableCell>
                  <Badge variant={u.active ? "secondary" : "outline"} className={u.active ? "text-success" : "text-muted-foreground"}>
                    {u.active ? t("employees.active") : t("employees.inactive")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(u)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={u.id === "u_admin"} onClick={() => removeUser(u)}>
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

function BrandsManagement({
  brands, products, add, update, remove,
}: {
  brands: string[];
  products: { vehicle: string }[];
  add: (b: string) => void;
  update: (oldName: string, newName: string) => void;
  remove: (b: string) => void;
}) {
  const t = useT();
  const [newBrand, setNewBrand] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const addBrand = () => {
    const n = newBrand.trim();
    if (!n) { toast.error(t("settings.brandNameRequired")); return; }
    if (brands.includes(n)) { toast.error(t("settings.brandExists")); return; }
    add(n); setNewBrand(""); toast.success(t("settings.brandAdded"));
  };

  const saveEdit = (oldName: string) => {
    const n = editValue.trim();
    if (!n) return;
    if (n !== oldName && brands.includes(n)) { toast.error(t("settings.brandExists")); return; }
    update(oldName, n); setEditing(null); toast.success(t("toast.updated"));
  };

  const removeBrand = async (b: string) => {
    const count = products.filter(p => p.vehicle === b).length;
    const desc = count > 0
      ? t("settings.brandDeleteLinked", { name: b, n: count })
      : t("settings.brandDelete", { name: b });
    const ok = await confirm({ title: t("settings.deleteBrand"), description: desc, destructive: true, confirmText: t("common.delete") });
    if (!ok) return;
    remove(b); toast.success(t("toast.deleted"));
  };

  return (
    <Card className="rounded-2xl">
      {confirmNode}
      <div className="p-4 border-b">
        <h3 className="font-semibold">{t("settings.brands")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("settings.brandsDesc")}</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-lg">
          <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder={t("settings.brandPh")} onKeyDown={(e) => e.key === "Enter" && addBrand()} />
          <Button onClick={addBrand}><Plus className="h-4 w-4 mr-1" />{t("common.add")}</Button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {brands.map(b => {
          const count = products.filter(p => p.vehicle === b).length;
          const isEditing = editing === b;
          return (
            <div key={b} className="flex items-center gap-2 rounded-lg border p-2 bg-card">
              {isEditing ? (
                <>
                  <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(b)} className="h-8" />
                  <Button size="sm" onClick={() => saveEdit(b)}>OK</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>X</Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{b}</div>
                    <div className="text-xs text-muted-foreground">{t("categories.productCount", { n: count })}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(b); setEditValue(b); }}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeBrand(b)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BranchesManagement({
  branches, add, update, remove,
}: {
  branches: string[];
  add: (b: string) => void;
  update: (oldName: string, newName: string) => void;
  remove: (b: string) => void;
}) {
  const t = useT();
  const [newBranch, setNewBranch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const { confirm, confirmNode } = useConfirm();

  const addBranchFn = () => {
    const n = newBranch.trim();
    if (!n) { toast.error(t("settings.branchNameRequired")); return; }
    if (branches.includes(n)) { toast.error(t("settings.branchExists")); return; }
    add(n); setNewBranch(""); toast.success(t("settings.branchAdded"));
  };

  const saveEdit = (oldName: string) => {
    const n = editValue.trim();
    if (!n) return;
    if (n !== oldName && branches.includes(n)) { toast.error(t("settings.branchExists")); return; }
    update(oldName, n); setEditing(null); toast.success(t("toast.updated"));
  };

  const removeBranch = async (b: string) => {
    if (branches.length <= 1) { toast.error(t("settings.branchMin")); return; }
    const ok = await confirm({ title: t("settings.deleteBranch"), description: t("settings.branchDelete", { name: b }), destructive: true, confirmText: t("common.delete") });
    if (!ok) return;
    remove(b); toast.success(t("toast.deleted"));
  };

  return (
    <Card className="rounded-2xl">
      {confirmNode}
      <div className="p-4 border-b">
        <h3 className="font-semibold">{t("settings.branchesTitle")}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{t("settings.branchesDesc")}</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-lg">
          <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder={t("settings.branchPh")} onKeyDown={(e) => e.key === "Enter" && addBranchFn()} />
          <Button onClick={addBranchFn}><Plus className="h-4 w-4 mr-1" />{t("common.add")}</Button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {branches.map(b => {
          const isEditing = editing === b;
          return (
            <div key={b} className="flex items-center gap-2 rounded-lg border p-2 bg-card">
              {isEditing ? (
                <>
                  <Input autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(b)} className="h-8" />
                  <Button size="sm" onClick={() => saveEdit(b)}>OK</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>X</Button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0 font-medium text-sm truncate">{b}</div>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(b); setEditValue(b); }}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeBranch(b)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
