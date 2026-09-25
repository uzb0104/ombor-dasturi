import { createFileRoute } from "@tanstack/react-router";
import { SalesPage } from "@/components/sales/SalesPage";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });
