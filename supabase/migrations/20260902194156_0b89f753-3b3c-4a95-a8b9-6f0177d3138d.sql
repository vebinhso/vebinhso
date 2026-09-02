GRANT SELECT ON public.admin_config TO authenticated;

CREATE POLICY "Người chơi đọc cấu hình vận hành câu hỏi"
ON public.admin_config
FOR SELECT
TO authenticated
USING (key IN ('priority_mode', 'category_toggles'));