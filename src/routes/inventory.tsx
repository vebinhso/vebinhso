import { createFileRoute } from "@tanstack/react-router";
import { GameLayout } from "@/components/GameLayout";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/inventory")({ component: Inventory });

function Inventory() {
  const en = useLocale() === "en";
  return (
    <GameLayout showBack>
      <div className="p-6 md:p-10 max-w-3xl w-full mx-auto">
        <div className="glass-card p-10 text-center">
          <h1 className="text-3xl font-black mb-4">🎒 {en ? "INVENTORY" : "HÀNH TRANG"}</h1>
          <div className="text-7xl mb-3 opacity-60">📭</div>
          <p className="font-bold text-muted-foreground">
            {en ? "Your inventory is empty. Items will be added later." : "Hành trang của bạn đang trống. Vật phẩm sẽ được bổ sung sau."}
          </p>
        </div>
      </div>
    </GameLayout>
  );
}
