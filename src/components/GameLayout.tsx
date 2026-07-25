import { ReactNode } from "react";
import bg from "@/assets/bg-house.jpg";
import { Link } from "@tanstack/react-router";

export function GameLayout({
  children,
  showBack = false,
  onBack,
  backLabel = "← VỀ NHÀ",
}: {
  children: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="relative min-h-screen w-full">
      <div className="bg-house" style={{ ["--bg-image" as never]: `url(${bg})` }} />
      {showBack && (
        onBack ? (
          <button onClick={onBack} className="toy-button absolute top-4 left-4 z-20 text-sm">
            {backLabel}
          </button>
        ) : (
          <Link to="/" className="toy-button absolute top-4 left-4 z-20 text-sm">
            {backLabel}
          </Link>
        )
      )}
      <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}
