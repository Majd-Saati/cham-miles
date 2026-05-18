import { createFileRoute } from "@tanstack/react-router";
import ChamMilesClient from "@/components/cham-miles/chamMilesClient";
import TiersSection from "@/components/TiersSection";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative w-full">
      <ChamMilesClient />
      <TiersSection />
    </div>
  );
}
