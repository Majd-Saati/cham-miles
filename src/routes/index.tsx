import { createFileRoute } from "@tanstack/react-router";
import ChamMilesClient from "@/components/cham-miles/chamMilesClient";
import TiersSection from "@/components/TiersSection";
import WindowParallex from "@/components/WindowParallex";
import ScrollThrottle from "@/components/ScrollThrottle";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="relative w-full">
      <ScrollThrottle />
      <ChamMilesClient />
      {/* <WindowParallex /> */}
      <TiersSection />
    </div>
  );
}
