import { createFileRoute } from "@tanstack/react-router";
import { ReportsCalendarPage } from "@/components/reports/ReportsCalendarPage";

export const Route = createFileRoute("/_app/reports")({ component: ReportsCalendarPage });
