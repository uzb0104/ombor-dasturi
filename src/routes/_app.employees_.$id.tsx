import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDetailPage } from "@/components/employees/EmployeeDetailPage";

export const Route = createFileRoute("/_app/employees_/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <EmployeeDetailPage id={id} />;
}
