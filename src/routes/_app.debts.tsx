import { createFileRoute } from "@tanstack/react-router";
import { DebtsPage } from "@/components/debts/DebtsPage";

export const Route = createFileRoute("/_app/debts")({
  component: DebtsPage,
});
