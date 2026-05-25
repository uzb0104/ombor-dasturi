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
import { Plus, Edit, Trash2, Shield, User as UserIcon, Lock, Sun, AlertTriangle, Car } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

type UserForm = Omit<AppUser, "id">;
const emptyUser = (): UserForm => ({
  name: "", email: "", password: "", role: "Sotuvchi",
  permissions: [], active: true,
});

function SettingsPage() {
  const { user, theme, toggleTheme, resetData, appUsers, addAppUser, updateAppUser, deleteAppUser, vehicleBrands, products, addVehicleBrand, updateVehicleBrand, deleteVehicleBrand } = useStore();
  const isAdmin = user?.role === "Admin";
  const { confirm, confirmNode } = useConfirm();

  const resetAll = async () => {
    const ok = await confirm({ title: "Demo ma'lumotlarni tiklash", description: "Barcha ma'lumotlar dastlabki holatga qaytariladi. Bu amalni qaytarib bo'lmaydi.", destructive: true, confirmText: "Tiklash" });
    if (ok) { resetData(); toast.success("Ma'lumotlar tiklandi"); }
  };

  return (
    <div className="space-y-5">
      {confirmNode}
      <PageHeader title="Sozlamalar" subtitle="Profil, foydalanuvchilar va tizim sozlamalari" />

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="profile"><UserIcon className="h-4 w-4 mr-1.5" />Profil</TabsTrigger>
          {isAdmin && <TabsTrigger value="users"><Shield className="h-4 w-4 mr-1.5" />Foydalanuvchilar</TabsTrigger>}
          {isAdmin && <TabsTrigger value="brands"><Car className="h-4 w-4 mr-1.5" />Avtomobil brendlari</TabsTrigger>}
          <TabsTrigger value="security"><Lock className="h-4 w-4 mr-1.5" />Xavfsizlik</TabsTrigger>
          <TabsTrigger value="appearance"><Sun className="h-4 w-4 mr-1.5" />Ko'rinish</TabsTrigger>
          {isAdmin && <TabsTrigger value="danger" className="text-destructive"><AlertTriangle className="h-4 w-4 mr-1.5" />Xavfli zona</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">Mening profilim</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ism</Label><Input defaultValue={user?.name} /></div>
              <div><Label>Email</Label><Input defaultValue={user?.email} disabled /></div>
              <div><Label>Lavozim</Label><Input defaultValue={user?.role} disabled /></div>
              <div><Label>Foydalanuvchi ID</Label><Input defaultValue={user?.id} disabled className="font-mono text-xs" /></div>
            </div>
            <Button onClick={() => toast.success("Saqlandi")}>Saqlash</Button>
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

        <TabsContent value="security" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">Parolni o'zgartirish</h3>
            <div className="grid grid-cols-1 gap-3">
              <div><Label>Joriy parol</Label><Input type="password" /></div>
              <div><Label>Yangi parol</Label><Input type="password" /></div>
              <div><Label>Yangi parolni tasdiqlash</Label><Input type="password" /></div>
            </div>
            <Button onClick={() => toast.success("Parol yangilandi")}>O'zgartirish</Button>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">Ko'rinish</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Qorong'i rejim</div>
                <div className="text-xs text-muted-foreground">Dark mode yoqish/o'chirish</div>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
            </div>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="danger" className="mt-5">
            <Card className="p-6 rounded-2xl space-y-3 border-destructive/30 max-w-2xl">
              <h3 className="font-semibold text-destructive">Xavfli zona</h3>
              <p className="text-sm text-muted-foreground">Barcha demo ma'lumotlarni dastlabki holatga qaytarish. Bu amalni qaytarib bo'lmaydi.</p>
              <Button variant="destructive" onClick={resetAll}>
                Demo ma'lumotlarni tiklash
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUser());
  const { confirm, confirmNode } = useConfirm();

  const removeUser = async (u: AppUser) => {
    const ok = await confirm({ title: "Foydalanuvchini o'chirish", description: `${u.name} o'chirilsinmi?`, destructive: true, confirmText: "O'chirish" });
    if (ok) { remove(u.id); toast.success("O'chirildi"); }
  };

  const startEdit = (u: AppUser) => {
    setEditing(u.id);
    setForm({ name: u.name, email: u.email, password: u.password, role: u.role, permissions: u.permissions, active: u.active });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Ism va email majburiy"); return; }
    if (!editing && !form.password.trim()) { toast.error("Parol kiriting"); return; }
    if (!editing && appUsers.some(u => u.email.toLowerCase() === form.email.toLowerCase())) {
      toast.error("Bu email allaqachon mavjud"); return;
    }
    const data: UserForm = {
      ...form,
      permissions: form.role === "Admin" ? ALL_PERMISSIONS : form.permissions,
    };
    if (editing) { update(editing, data); toast.success("Yangilandi"); }
    else { add(data); toast.success("Foydalanuvchi qo'shildi"); }
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
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">Foydalanuvchilar va ruxsatlar</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Admin yangi foydalanuvchi yaratadi va ularga bo'limlarga kirish ruxsatini beradi</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyUser()); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Yangi foydalanuvchi</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>F.I.SH *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} /></div>
                <div><Label>Parol {editing && "(o'zgartirish uchun yozing)"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                <div><Label>Lavozim</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium text-sm">Faol</div>
                  <div className="text-xs text-muted-foreground">Nofaol foydalanuvchilar tizimga kira olmaydi</div>
                </div>
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Bo'limlarga ruxsat</Label>
                  {form.role === "Admin"
                    ? <Badge variant="secondary">Admin barcha ruxsatlarga ega</Badge>
                    : <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForm(f => ({ ...f, permissions: f.permissions.length === ALL_PERMISSIONS.length ? [] : ALL_PERMISSIONS }))}>
                        {form.permissions.length === ALL_PERMISSIONS.length ? "Barchasini olib tashlash" : "Hammasini tanlash"}
                      </button>
                  }
                </div>
                <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${form.role === "Admin" ? "opacity-50 pointer-events-none" : ""}`}>
                  {PERMISSION_MODULES.map(m => (
                    <label key={m.path} className="flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={form.permissions.includes(m.path)} onCheckedChange={() => togglePerm(m.path)} />
                      <span className="truncate">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={submit}>Saqlash</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Foydalanuvchi</TableHead><TableHead>Email</TableHead><TableHead>Lavozim</TableHead>
            <TableHead>Ruxsatlar</TableHead><TableHead>Holat</TableHead>
            <TableHead className="text-right">Amallar</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {appUsers.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-sm font-mono">{u.email}</TableCell>
                <TableCell><Badge variant={u.role === "Admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.role === "Admin" ? "Hammasi" : `${u.permissions.length} / ${ALL_PERMISSIONS.length} bo'lim`}
                </TableCell>
                <TableCell>
                  <Badge variant={u.active ? "secondary" : "outline"} className={u.active ? "text-success" : "text-muted-foreground"}>
                    {u.active ? "Faol" : "Nofaol"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(u)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" disabled={u.id === "u_admin"} onClick={() => { if (confirm(`${u.name} ni o'chirish?`)) { remove(u.id); toast.success("O'chirildi"); } }}>
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
  const [newBrand, setNewBrand] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const addBrand = () => {
    const n = newBrand.trim();
    if (!n) { toast.error("Brend nomini kiriting"); return; }
    if (brands.includes(n)) { toast.error("Bu brend allaqachon mavjud"); return; }
    add(n); setNewBrand(""); toast.success("Brend qo'shildi");
  };

  const saveEdit = (oldName: string) => {
    const n = editValue.trim();
    if (!n) return;
    if (n !== oldName && brands.includes(n)) { toast.error("Bunday brend bor"); return; }
    update(oldName, n); setEditing(null); toast.success("Yangilandi");
  };

  const removeBrand = (b: string) => {
    const count = products.filter(p => p.vehicle === b).length;
    if (count > 0) {
      if (!confirm(`"${b}" brendiga ${count} ta tovar bog'langan. Baribir o'chirilsinmi?`)) return;
    } else if (!confirm(`"${b}" brendi o'chirilsinmi?`)) return;
    remove(b); toast.success("O'chirildi");
  };

  return (
    <Card className="rounded-2xl">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Avtomobil brendlari</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Yangi avtomobil brendlarini qo'shing yoki mavjudlarini tahrirlang</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3 max-w-lg">
          <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Masalan: BYD" onKeyDown={(e) => e.key === "Enter" && addBrand()} />
          <Button onClick={addBrand}><Plus className="h-4 w-4 mr-1" />Qo'shish</Button>
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
                    <div className="text-xs text-muted-foreground">{count} ta tovar</div>
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
