// 운영 도구 공용 부품: API 호출, 입력 칸, 사진·PDF 선택·업로드
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Lx = { en: string; ko: string };
export type MediaFolder = "materials" | "products" | "site" | "reports";

export const TOKEN = typeof __CMS_TOKEN__ === "string" ? __CMS_TOKEN__ : "";

export class ApiError extends Error {
  errors?: string[];
}
export const api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
  const r = await fetch(`/__cms${path}`, { ...init, headers: { "x-cms-token": TOKEN, ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new ApiError(j.error ?? (j.errors ? `검사 오류 ${j.errors.length}건` : r.statusText));
    e.errors = j.errors;
    throw e;
  }
  return j as T;
};

// ---------- 작은 입력 컴포넌트 ----------

export const inputCls = "w-full border border-mc-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-mc-ink disabled:bg-mc-cream";

export const Field = ({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: string }) => (
  <label className={cn("block", className)}>
    <span className="text-[11px] font-medium text-mc-mute">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <span className="mt-0.5 block text-[11px] text-mc-mute">{hint}</span>}
  </label>
);

export const LInput = ({ label, value, onChange, multiline = false }: { label: string; value: Lx; onChange: (v: Lx) => void; multiline?: boolean }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {(["en", "ko"] as const).map((k) => (
      <Field key={k} label={`${label} (${k === "en" ? "영문" : "한글"})`}>
        {multiline ? (
          <textarea rows={2} value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} className={inputCls} />
        ) : (
          <input value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })} className={inputCls} />
        )}
      </Field>
    ))}
  </div>
);

export const Num = ({ value, onChange, step = "any" }: { value: number; onChange: (n: number) => void; step?: string }) => (
  <input
    type="number"
    step={step}
    value={Number.isFinite(value) ? value : ""}
    onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
    className={inputCls}
  />
);

export const Btn = ({
  children,
  onClick,
  variant = "outline",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "dark" | "outline" | "danger";
  disabled?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40",
      variant === "dark" && "bg-mc-ink text-mc-paper hover:bg-mc-burgundy",
      variant === "outline" && "border border-mc-ink/25 hover:border-mc-ink",
      variant === "danger" && "border border-red-700/40 text-red-800 hover:bg-red-50",
    )}
  >
    {children}
  </button>
);

// ---------- 미디어 선택·업로드 ----------

export const uploadFile = async (folder: MediaFolder, file: File, overwrite = false) =>
  api<{ path: string }>(`/media/${folder}${overwrite ? "?overwrite=1" : ""}`, {
    method: "POST",
    headers: { "x-filename": encodeURIComponent(file.name), "Content-Type": "application/octet-stream" },
    body: file,
  });

export const MediaPicker = ({
  folder,
  value,
  onChange,
  accept,
}: {
  folder: MediaFolder;
  value?: string | null;
  onChange: (path: string | undefined) => void;
  accept: string;
}) => {
  const [files, setFiles] = useState<{ path: string; size: number }[]>([]);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const lists = await Promise.all(
      (folder === "reports" ? ["reports"] : ["site", "materials", "products"]).map((f) =>
        api<{ files: { path: string; size: number }[] }>(`/media/${f}`),
      ),
    );
    setFiles(lists.flatMap((l) => l.files));
  }, [folder]);
  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [load]);

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    try {
      let r: { path: string };
      try {
        r = await uploadFile(folder, file);
      } catch (e) {
        if (e instanceof ApiError && /같은 이름/.test(e.message) && window.confirm(`${e.message}\n덮어쓸까요?`))
          r = await uploadFile(folder, file, true);
        else throw e;
      }
      await load();
      onChange(r.path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)} className={cn(inputCls, "max-w-xs")}>
          <option value="">(없음)</option>
          {files.map((f) => (
            <option key={f.path} value={f.path}>
              {f.path.replace("/media/", "")} · {Math.round(f.size / 1024)}KB
            </option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-mc-ink/25 px-3.5 py-1.5 text-sm hover:border-mc-ink">
          <Upload className="h-3.5 w-3.5" /> 업로드
          <input type="file" accept={accept} className="sr-only" onChange={(e) => onUpload(e.target.files?.[0])} />
        </label>
        {value && (
          <a href={value} target="_blank" rel="noreferrer" className="text-xs underline">
            열기
          </a>
        )}
      </div>
      {value && folder !== "reports" && <img src={value} alt="" className="h-28 w-28 border border-mc-line object-cover" />}
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
};
