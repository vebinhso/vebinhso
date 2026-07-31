import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { setBgm, stopLoopSfx } from "@/lib/audio";

function RoleplayLayout() {
  // Vào khu nhập vai: tắt hoàn toàn nhạc nền của trò chơi, chỉ còn tiếng của phim.
  useEffect(() => {
    setBgm(null);
    stopLoopSfx("rain");
    stopLoopSfx("tornado");
    return () => {
      setBgm("home");
    };
  }, []);

  return <Outlet />;
}

export const Route = createFileRoute("/roleplay")({
  component: RoleplayLayout,
});
