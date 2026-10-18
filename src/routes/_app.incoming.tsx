import { createFileRoute } from "@tanstack/react-router";
import { IncomingPage } from "@/components/incoming/IncomingPage";

type IncomingSearch = {
  region?: string;
  tab?: "incoming" | "price-comparison";
};

export const Route = createFileRoute("/_app/incoming")({
  validateSearch: (search: Record<string, unknown>): IncomingSearch => ({
    region: typeof search.region === "string" ? search.region : undefined,
    tab: ["incoming", "price-comparison"].includes(search.tab as string)
      ? (search.tab as "incoming" | "price-comparison")
      : undefined,
  }),
  component: IncomingRouteComponent,
});

function IncomingRouteComponent() {
  const searchParams = Route.useSearch();
  return <IncomingPage initialRegion={searchParams.region} initialTab={searchParams.tab} />;
}
