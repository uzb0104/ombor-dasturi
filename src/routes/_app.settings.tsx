import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { PageHeader, useConfirm } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import {
  Lock,
  Sun,
  Eye,
  EyeOff,
  DollarSign,
  Check,
  RefreshCw,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { roleLabel } from "@/lib/i18n/helpers";
import { UsersManagement } from "@/components/settings/UsersManagement";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const t = useT();

  const {
    user,
    theme,
    toggleTheme,
    appUsers,
    addAppUser,
    updateAppUser,
    deleteAppUser,
    updateProfile,
    changePassword,
    usdRate,
    usdRateMode,
    cbuRate,
    setUsdRateMode,
    setUsdRate,
    fetchLiveUsdRate,
  } = useStore();

  const [fetchingRate, setFetchingRate] = useState(false);
  const [manualInputRate, setManualInputRate] = useState(usdRate || 12835);

  useEffect(() => {
    setManualInputRate(usdRate || 12835);
  }, [usdRate]);

  const isAdmin = user?.role === "Admin";
  const { confirm } = useConfirm();

  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

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

  const handleManualRateSave = () => {
    const val = Math.max(1, Number(manualInputRate));
    setUsdRate(val);
    toast.success(
      `Dollar kursi saqlandi: 1 USD = ${val.toLocaleString("uz-UZ")} so'm (Qo'lda kiritilgan)`,
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader showBack={false} title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4 mr-1.5" />
            {t("settings.tab.profile")}
          </TabsTrigger>
          <TabsTrigger value="currency">
            <DollarSign className="h-4 w-4 mr-1.5 text-emerald-500" />
            {t("settings.tab.currency")}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users">
              <Shield className="h-4 w-4 mr-1.5" />
              {t("settings.tab.users")}
            </TabsTrigger>
          )}
          <TabsTrigger value="appearance">
            <Sun className="h-4 w-4 mr-1.5" />
            {t("settings.tab.appearance")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl items-start">
            {/* Mening profilim */}
            <Card className="p-4 sm:p-5 rounded-xl space-y-3.5 border-border/60 shadow-xs">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                {t("settings.myProfile")}
              </h3>
              <div className="space-y-2.5">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("common.name")}</Label>
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="h-9 text-xs sm:text-sm mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email / Login</Label>
                  <Input
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="admin@autoerp.uz yoki login"
                    className="h-9 text-xs sm:text-sm mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("common.role")}</Label>
                    <Input
                      value={user?.role ? roleLabel(t, user.role) : ""}
                      disabled
                      className="h-9 text-xs mt-1 bg-muted/40"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("settings.userId")}</Label>
                    <Input
                      value={user?.id}
                      disabled
                      className="h-9 text-[11px] font-mono mt-1 bg-muted/40"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={handleProfileSave}
                  className="h-8 px-4 text-xs font-semibold"
                >
                  {t("common.save")}
                </Button>
              </div>
            </Card>

            {/* Xavfsizlik: Parolni o'zgartirish */}
            <Card className="p-4 sm:p-5 rounded-xl space-y-3.5 border-border/60 shadow-xs">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                {t("settings.changePassword")}
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePasswordChange();
                }}
                className="space-y-2.5"
              >
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t("settings.currentPassword")}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showCurrentPass ? "text" : "password"}
                      value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="h-9 text-xs sm:text-sm pr-9"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      tabIndex={-1}
                    >
                      {showCurrentPass ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t("settings.newPassword")}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showNewPass ? "text" : "password"}
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="h-9 text-xs sm:text-sm pr-9"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      tabIndex={-1}
                    >
                      {showNewPass ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {t("settings.confirmPassword")}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirmPass ? "text" : "password"}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="h-9 text-xs sm:text-sm pr-9"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      tabIndex={-1}
                    >
                      {showConfirmPass ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="pt-1">
                  <Button size="sm" type="submit" className="h-8 px-4 text-xs font-semibold">
                    {t("common.change")}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="currency" className="mt-5 space-y-5">
          {/* Dollar Kursi (Valyuta sozlamalari) */}
          <Card className="p-6 rounded-2xl space-y-5 max-w-2xl border-border/60 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/50">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Dollar Kursi (Valyuta sozlamalari)
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Tovarlarga narx kiritish va butun tizimda soʻm hamda dollar oʻrtasida hisob-kitob
                  qilishda ishlatiladi.
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 ${
                  usdRateMode === "manual"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                }`}
              >
                {usdRateMode === "manual"
                  ? "Qo'lda kiritilgan kurs faol"
                  : "Markaziy Bank kursi faol"}
              </Badge>
            </div>

            {/* Rejim tanlash (Rushnoy yoki Markaziy Bank) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUsdRateMode("manual")}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  usdRateMode === "manual"
                    ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500 shadow-sm"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">Qo'lda kiritish (Rushnoy)</span>
                  {usdRateMode === "manual" && <Check className="h-4 w-4 text-amber-500" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Admin oʻzi xohlagan kursni kiritadi va barcha tovarlar shu kurs asosida
                  hisoblanadi.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsdRateMode("cbu");
                  toast.success("Markaziy Bank kursi faollashtirildi");
                }}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  usdRateMode === "cbu"
                    ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 shadow-sm"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">Markaziy Bank (CBU)</span>
                  {usdRateMode === "cbu" && <Check className="h-4 w-4 text-emerald-500" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  Oʻzbekiston Markaziy Bankining rasmiy kursi boʻyicha avtomatik ishlaydi.
                </p>
              </button>
            </div>

            {/* Qo'lda kiritish inputi */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin belgilagan kurs (Rushnoy):
                </Label>
                {usdRateMode === "manual" && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    ● Hozir butun tizimda shu kurs ishlayapti
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 max-w-md">
                <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">
                  1 USD ($) =
                </span>
                <Input
                  type="number"
                  value={manualInputRate}
                  onChange={(e) => {
                    const val = Math.max(1, Number(e.target.value));
                    setManualInputRate(val);
                    setUsdRate(val);
                  }}
                  className="font-mono text-base font-bold text-foreground h-10"
                />
                <span className="text-sm font-semibold text-muted-foreground">so'm</span>
                <Button size="sm" onClick={handleManualRateSave} className="shrink-0 h-10">
                  Saqlash
                </Button>
              </div>
            </div>

            {/* Markaziy Bank integratsiyasi */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase font-semibold">
                  Markaziy Bank rasmiy kursi:
                </div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                  1 USD = {(cbuRate || 12835).toLocaleString("uz-UZ")} so'm
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  className="gap-1.5 text-xs h-8"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${fetchingRate ? "animate-spin" : ""}`} />
                  MB kursini yangilash
                </Button>
                {usdRateMode !== "cbu" && cbuRate && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setManualInputRate(cbuRate);
                      setUsdRate(cbuRate);
                      toast.success(
                        `MB kursi (${cbuRate.toLocaleString()} so'm) qo'lda kiritilgan kursga olindi`,
                      );
                    }}
                    className="text-xs h-8"
                  >
                    Ushbu kursni qo'llash
                  </Button>
                )}
              </div>
            </div>

            {/* Hozirgi yakuniy faol kurs xabari */}
            <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between border-t border-border/40">
              <span>Hozirgi tovarlar hisob-kitobi uchun faol kurs:</span>
              <span className="font-bold font-mono text-foreground text-sm">
                1 USD = {usdRate.toLocaleString("uz-UZ")} so'm
              </span>
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
