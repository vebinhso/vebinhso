import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getMyHouseSettings,
  listMyFriendsForWhitelist,
  updateHouseSettings,
  type HousePrivacy,
} from "@/lib/friend-houses.functions";
import { useLocale } from "@/lib/locale";

const options = (en: boolean): Array<{ id: HousePrivacy; icon: string; label: string; hint: string }> => [
  { id: "public", icon: "🌐", label: en ? "Public" : "Công khai", hint: en ? "All signed-in players can enter." : "Tất cả người chơi đã đăng nhập đều có thể vào." },
  { id: "friends", icon: "👥", label: en ? "Friends" : "Bạn bè", hint: en ? "Only your accepted friends can enter." : "Chỉ bạn bè của bạn được vào." },
  { id: "custom", icon: "✅", label: en ? "Limited" : "Giới hạn", hint: en ? "Only selected friends can enter." : "Chỉ những người bạn được chọn mới có thể vào." },
  { id: "closed", icon: "🔒", label: en ? "Lock door" : "Khóa cửa", hint: en ? "Nobody else can enter." : "Không ai khác có thể vào nhà." },
];

export function HouseAccessSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const en = useLocale() === "en";
  const qc = useQueryClient();
  const getSettings = useServerFn(getMyHouseSettings);
  const getFriends = useServerFn(listMyFriendsForWhitelist);
  const updateSettings = useServerFn(updateHouseSettings);
  const [privacy, setPrivacy] = useState<HousePrivacy>("friends");
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const settingsQ = useQuery({ queryKey: ["my-house"], queryFn: () => getSettings(), enabled: open });
  const friendsQ = useQuery({ queryKey: ["my-friends-whitelist"], queryFn: () => getFriends(), enabled: open && privacy === "custom" });

  useEffect(() => {
    const data = settingsQ.data;
    if (!data) return;
    setPrivacy(data.house_privacy === "private" ? "closed" : data.house_privacy);
    setAllowed(new Set(data.house_allow_list ?? []));
  }, [settingsQ.data]);

  const toggle = (id: string) => setAllowed((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    setBusy(true);
    try {
      await updateSettings({ data: { privacy, house_allow_list: Array.from(allowed) } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-house"] }),
        qc.invalidateQueries({ queryKey: ["friend-houses"] }),
      ]);
      onOpenChange(false);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{en ? "Who can enter your home?" : "Ai được vào nhà của bạn?"}</DialogTitle>
          <DialogDescription>{en ? "Choose the access level for your home." : "Chọn quyền vào nhà phù hợp với bạn."}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {options(en).map((option) => (
            <Button
              key={option.id}
              type="button"
              variant={privacy === option.id ? "default" : "outline"}
              className="h-auto min-h-20 whitespace-normal px-3 py-3"
              onClick={() => setPrivacy(option.id)}
            >
              <span className="flex flex-col items-center gap-1 text-center">
                <span className="text-xl" aria-hidden="true">{option.icon}</span>
                <span className="font-black">{option.label}</span>
                <span className="text-[11px] font-medium opacity-80">{option.hint}</span>
              </span>
            </Button>
          ))}
        </div>

        {privacy === "custom" && (
          <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
            {friendsQ.isLoading && <p className="p-3 text-sm text-muted-foreground">{en ? "Loading friends…" : "Đang tải bạn bè…"}</p>}
            {friendsQ.data?.length === 0 && <p className="p-3 text-sm text-muted-foreground">{en ? "No friends to select yet." : "Chưa có bạn bè để chọn."}</p>}
            {friendsQ.data?.map((friend) => (
              <label key={friend.user_id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted">
                <input type="checkbox" checked={allowed.has(friend.user_id)} onChange={() => toggle(friend.user_id)} className="h-5 w-5" />
                <span className="font-bold">{friend.display_name || friend.username}</span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{en ? "Cancel" : "Hủy"}</Button>
          <Button onClick={save} disabled={busy || settingsQ.isLoading}>{busy ? (en ? "Saving…" : "Đang lưu…") : (en ? "Save" : "Lưu")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}