import { createFileRoute, Outlet, redirect, isRedirect, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";
import { getToken } from "@/lib/api";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    // JWT token mavjudligini tekshiramiz
    const token = getToken();
    if (!token) {
      // Zustand keshida ham tekshiramiz (tezkor redirect)
      const raw = window.localStorage.getItem("autoerp-pro-v2");
      if (!raw) throw redirect({ to: "/login" });
      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        if (isRedirect(e)) throw e;
        throw redirect({ to: "/login" });
      }
      if (!parsed?.state?.user) throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const t = useT();
  const user = useStore((s) => s.user);
  const restoreSession = useStore((s) => s.restoreSession);
  const navigate = useNavigate();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persist hydration + session restore
    setHydrated(true);
    // Sahifa yangilanganda sessiyani backenddan tekshiramiz
    restoreSession();
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      navigate({ to: "/login" });
    }
  }, [hydrated, user, navigate]);

  if (!hydrated || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  return <AppShell><Outlet /></AppShell>;
}
