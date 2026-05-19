import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CreateEventForm } from "@/components/CreateEventForm";

export const Route = createFileRoute("/create")({
  component: CreateRouteComponent,
});

function CreateRouteComponent() {
  const navigate = useNavigate();

  return <CreateEventForm onCreated={(id) => navigate({ to: "/event/$id", params: { id } })} />;
}
