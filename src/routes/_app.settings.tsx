import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, useConfirm } from "@/components/ui-kit";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Lock,
  Sun,
  Eye,
  EyeOff,
  DollarSign,
  Languages,
  RefreshCw,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { useT, useLang, LANG_LABELS, UI_LANGS, type Lang } from "@/lib/i18n";
import { roleLabel } from "@/lib/i18n/helpers";
import { UsersManagement } from "@/components/settings/UsersManagement";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const t = useT();
  const { lang, setLang } = useLang();
  const {
    user,
    theme,
    toggleTheme,
    appUsers,
    addAppUser,
    updateAppUser,
    deleteAppUser,
    vehicleBrands,
    products,
    addVehicleBrand,
    updateVehicleBrand,
    deleteVehicleBrand,
    branches,
    addBranch,
    updateBranch,
    deleteBranch,
    updateProfile,
    changePassword,
    usdRate,
    setUsdRate,
    fetchLiveUsdRate,
  } = useStore();
  const [fetchingRate, setFetchingRate] = useState(false);
  const isAdmin = user?.role === "Admin";
  const { confirm } = useConfirm();

  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showUserPass, setShowUserPass] = useState(false);

  const handleProfileSave = () => {
    if (!profileName.trim()) {
      toast.error(t("settings.nameEmpty"));
      return;
    }
    if (!profileEmail.trim()) {
      toast.error("Email yoki Login kiritilishi shart");
      return;
    }
    updateProfile({ name: profileName.trim(), email: profileEmail.trim() });
    toast.success(t("settings.profileUpdated"));
  };

  const handlePasswordChange = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error(t("toast.fillAll"));
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error(t("toast.passwordMismatch"));
      return;
    }
    const ok = await changePassword(passwords.current, passwords.new);
    if (ok) {
      toast.success(t("settings.passwordUpdated"));
      setPasswords({ current: "", new: "", confirm: "" });
    } else {
      toast.error(t("toast.wrongPassword"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4 mr-1.5" />
            {t("settings.tab.profile")}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users">
              <Shield className="h-4 w-4 mr-1.5" />
              {t("settings.tab.users")}
            </TabsTrigger>
          )}
          {/* {isAdmin && (
            <TabsTrigger value="branches">
              <Building2 className="h-4 w-4 mr-1.5" />
              {t("settings.tab.branches")}
            </TabsTrigger>
          )} */}
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-1.5" />
            {t("settings.tab.security")}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Sun className="h-4 w-4 mr-1.5" />
            {t("settings.tab.appearance")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">{t("settings.myProfile")}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("common.name")}</Label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div>
                <Label>Email / Login</Label>
                <Input
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="admin@autoerp.uz yoki login"
                />
              </div>
              <div>
                <Label>{t("common.role")}</Label>
                <Input value={user?.role ? roleLabel(t, user.role) : ""} disabled />
              </div>
              <div>
                <Label>{t("settings.userId")}</Label>
                <Input value={user?.id} disabled className="font-mono text-xs" />
              </div>
            </div>
            <Button onClick={handleProfileSave}>{t("common.save")}</Button>
          </Card>

          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl mt-5">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              {t("settings.language")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("settings.selectLanguage")}</p>
            <div className="flex items-center gap-3 max-w-xs">
              <Select
                value={lang === "uz_cyr" ? "uz" : lang}
                onValueChange={(v) => setLang(v as Lang)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UI_LANGS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANG_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Dollar Kursi (Valyuta kursi)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tovarlarga narx kiritish va so'm hamda dollar o'rtasida real vaqtda avtomatik
                  hisob-kitob qilishda ishlatiladi.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={fetchingRate}
                onClick={async () => {
                  setFetchingRate(true);
                  const rate = await fetchLiveUsdRate();
                  setFetchingRate(false);
                  if (rate) {
                    toast.success(
                      `Markaziy Bank kursi yangilandi: 1 USD = ${rate.toLocaleString()} so'm`,
                    );
                  } else {
                    toast.error("Markaziy Bank kursini olib bo'lmadi");
                  }
                }}
                className="gap-2 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${fetchingRate ? "animate-spin" : ""}`} />
                Markaziy Bank kursini yangilash
              </Button>
            </div>
            <div className="flex items-center gap-3 max-w-xs pt-1">
              <span className="text-sm font-medium">1 USD ($) =</span>
              <Input
                type="number"
                value={usdRate || 12835}
                onChange={(e) => setUsdRate(Math.max(1, Number(e.target.value)))}
                className="font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400"
              />
              <span className="text-sm font-medium">so'm</span>
            </div>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-5">
            <UsersManagement
              appUsers={appUsers}
              add={addAppUser}
              update={updateAppUser}
              remove={deleteAppUser}
            />
          </TabsContent>
        )}

        {/* {isAdmin && (
          <TabsContent value="branches" className="mt-5">
            <BranchesManagement
              branches={branches}
              add={addBranch}
              update={updateBranch}
              remove={deleteBranch}
            />
          </TabsContent>
        )} */}

        <TabsContent value="security" className="mt-5">
          <Card className="p-6 rounded-2xl space-y-4 max-w-2xl">
            <h3 className="font-semibold">{t("settings.changePassword")}</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePasswordChange();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>{t("settings.currentPassword")}</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showCurrentPass ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showCurrentPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>{t("settings.newPassword")}</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPass ? "text" : "password"}
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>{t("settings.confirmPassword")}</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirmPass ? "text" : "password"}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showConfirmPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <Button type="submit">{t("common.change")}</Button>
            </form>
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
      </Tabs>
    </div>
  );
}
