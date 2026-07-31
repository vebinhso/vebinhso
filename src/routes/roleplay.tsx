import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { setBgm, stopLoopSfx } from "@/lib/audio";

function RoleplayLayout() {
  const pathname = useLocation({ select: (l) => l.pathname });
  // Trang chọn bài nhập vai vẫn giữ nhạc nền.
  // Chỉ khi vào một bài cụ thể mới tắt hẳn, để chỉ còn tiếng của phim.
  const inLesson = pathname.replace(/\/+$/, "") !== "/roleplay";

  useEffect(() => {
    if (!inLesson) {
      setBgm("home");
      return;
    }
    setBgm(null);
    stopLoopSfx("rain");
    stopLoopSfx("tornado");
    return () => {
      setBgm("home");
    };
  }, [inLesson]);

  return <Outlet />;
}

export const Route = createFileRoute("/roleplay")({
  component: RoleplayLayout,
});
