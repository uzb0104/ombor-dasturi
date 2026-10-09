import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/barcode")({
  component: BarcodeRedirectPage,
});

function BarcodeRedirectPage() {
  return <Navigate to="/products" replace />;
}
