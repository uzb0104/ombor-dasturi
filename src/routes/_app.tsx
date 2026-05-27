import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("autoerp-pro-v1");
    if (!raw) throw redirect({ to: "/login" });
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      if (isRedirect(e)) throw e;
      throw redirect({ to: "/login" });
    }
    if (!parsed?.state?.user) throw redirect({ to: "/login" });
  },
  component: AppLayout,
});

function AppLayout() {
  const user = useStore((s) => s.user);
  if (!user) return null;
  return <AppShell><Outlet /></AppShell>;
}
