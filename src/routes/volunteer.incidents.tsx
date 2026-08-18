import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/volunteer/incidents")({
  component: IncidentsLayout,
});

function IncidentsLayout() {
  return <Outlet />;
}