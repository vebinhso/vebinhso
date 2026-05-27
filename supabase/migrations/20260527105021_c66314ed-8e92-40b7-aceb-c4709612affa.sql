-- Thêm cột thread_key
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS thread_key text;

-- Đổi tên cột
ALTER TABLE public.messages RENAME COLUMN from_user TO from_id;
ALTER TABLE public.messages RENAME COLUMN to_user TO to_id;
ALTER TABLE public.messages RENAME COLUMN content TO text;

-- Đảm bảo thread_key không null (tạo giá trị tạm cho dữ liệu cũ nếu có)
UPDATE public.messages SET thread_key = COALESCE(thread_key, from_id::text || '-' || to_id::text) WHERE thread_key IS NULL;
ALTER TABLE public.messages ALTER COLUMN thread_key SET NOT NULL;

-- Index cho truy vấn theo thread
CREATE INDEX IF NOT EXISTS messages_thread_idx ON public.messages(thread_key, created_at);

-- Quyền truy cập Data API (bắt buộc cho bảng public)
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- Đảm bảo RLS đã bật
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ để tránh conflict
DROP POLICY IF EXISTS "msg_select_involved" ON public.messages;
DROP POLICY IF EXISTS "msg_insert_own" ON public.messages;
DROP POLICY IF EXISTS "msg_delete_own" ON public.messages;

-- Policy mới: chỉ đọc tin nhắn mình gửi hoặc nhận
CREATE POLICY "read own messages" ON public.messages
  FOR SELECT TO authenticated USING (auth.uid() = from_id OR auth.uid() = to_id);

-- Policy mới: chỉ gửi tin với danh nghĩa chính mình
CREATE POLICY "send own messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_id);