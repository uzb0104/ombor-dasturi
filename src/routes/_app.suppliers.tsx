import { createFileRoute, redirect } from "@tanstack/react-router";

// Suppliers endi Kirimlar sahifasiga birlashtirildi
export const Route = createFileRoute("/_app/suppliers")({
  beforeLoad: () => {
    throw redirect({ to: "/incoming" });
  },
  component: () => null,
});
