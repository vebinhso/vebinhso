-- Thêm cột floor vào 3 bảng, mặc định 0 (tầng trệt)
ALTER TABLE public.walls ADD COLUMN IF NOT EXISTS floor integer NOT NULL DEFAULT 0;
ALTER TABLE public.roofs ADD COLUMN IF NOT EXISTS floor integer NOT NULL DEFAULT 0;
ALTER TABLE public.placed_items ADD COLUMN IF NOT EXISTS floor integer NOT NULL DEFAULT 0;