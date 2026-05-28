import { useEffect } from "react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("autoerp-pro-v1");
    if (!raw) throw redirect({ to: "/login" });
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.state?.user) throw redirect({ to: "/login" });
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const user = useStore((s) => s.user);
  const fetchAllData = useStore((s) => s.fetchAllData);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  if (!user) return null;
  return <AppShell><Outlet /></AppShell>;
}
