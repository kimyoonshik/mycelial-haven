import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  onChange: (sqft: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  size?: "sm" | "md";
}

// sqft 정수 입력. 입력 중에는 자유롭게 타이핑하고, 포커스를 벗어날 때 범위로 보정한다.
export const SqftStepper = ({ value, onChange, min = 1, max = 9999, step = 1, label, size = "md" }: Props) => {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (n: number) => {
    const v = Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : min)));
    setDraft(String(v));
    if (v !== value) onChange(v);
  };

  const btn = cn("hover:bg-mc-cream disabled:opacity-30", size === "sm" ? "p-2" : "p-3");
  return (
    <div className="flex items-center border border-mc-line" role="group" aria-label={label}>
      <button type="button" aria-label={`${label} −${step}`} disabled={value <= min} onClick={() => commit(value - step)} className={btn}>
        <Minus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={() => commit(Number(draft))}
        onKeyDown={(e) => e.key === "Enter" && commit(Number(draft))}
        className={cn("bg-transparent text-center outline-none", size === "sm" ? "w-12 text-sm" : "w-16")}
      />
      <span className={cn("pr-2 text-mc-mute", size === "sm" ? "text-xs" : "text-sm")}>sqft</span>
      <button type="button" aria-label={`${label} +${step}`} disabled={value >= max} onClick={() => commit(value + step)} className={btn}>
        <Plus className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
};
