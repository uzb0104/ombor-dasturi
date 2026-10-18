import { createFileRoute } from "@tanstack/react-router";
import { ExpensesPage } from "@/components/expenses/ExpensesPage";

export const Route = createFileRoute("/_app/expenses")({
  component: ExpensesPage,
});
