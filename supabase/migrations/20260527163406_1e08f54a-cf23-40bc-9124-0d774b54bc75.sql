-- LƯU Ý: Bảng public.messages trong project dùng cột to_id / from_id
-- (không phải to_user / from_user). Migration này dùng đúng tên cột thực tế.

-- 1) Thêm 2 cột trạng thái tin nhắn (idempotent)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ NULL;

-- 2) Index tăng tốc query tin chưa nhận / chưa xem cho 1 người nhận
CREATE INDEX IF NOT EXISTS idx_messages_to_unseen
  ON public.messages (to_id)
  WHERE seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_to_undelivered
  ON public.messages (to_id)
  WHERE delivered_at IS NULL;

-- 3) RLS: chỉ NGƯỜI NHẬN được UPDATE (để đánh dấu đã nhận / đã xem)
DROP POLICY IF EXISTS "msg_update_recipient" ON public.messages;

CREATE POLICY "msg_update_recipient"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_id)
  WITH CHECK (auth.uid() = to_id);
