import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
};

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ImageUploadField({ value, onChange, label = "Ảnh" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      alert("Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.");
      return;
    }
    if (file.size > MAX_SIZE) {
      alert("Ảnh quá lớn (tối đa 5MB).");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const rand = Math.random().toString(36).slice(2, 10);
      const path = `q/${Date.now()}-${rand}.${ext}`;
      const { error } = await supabase.storage
        .from("question-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("question-images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e: any) {
      alert("Tải ảnh thất bại: " + (e?.message || e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        {value ? (
          <>
            <img src={value} alt="" className="w-12 h-12 object-cover rounded border border-orange-200" />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-2 py-1 rounded bg-orange-400 text-white text-xs font-bold disabled:opacity-50"
            >
              {uploading ? "Đang tải lên..." : "Đổi ảnh"}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="px-2 py-1 rounded bg-red-500 text-white text-xs font-bold disabled:opacity-50"
            >
              Xóa ảnh
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-2 py-1 rounded bg-orange-400 text-white text-xs font-bold disabled:opacity-50"
          >
            {uploading ? "Đang tải lên..." : `📁 Tải ${label} lên`}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Hoặc dán link ${label.toLowerCase()}...`}
        className="w-full px-2 py-1 rounded border border-orange-100 text-xs"
      />
    </div>
  );
}
