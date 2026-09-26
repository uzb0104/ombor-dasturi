import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/report-day/$date")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_app/report-day/$date"!</div>;
}
