import { createFileRoute } from "@tanstack/react-router";
import { UsedBatteriesPage } from "@/components/used-batteries/UsedBatteriesPage";

export const Route = createFileRoute("/_app/used-batteries")({
  component: UsedBatteriesPage,
});
