import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
  return (
    <label className="flex items-center gap-2">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer h-4 w-4 rounded border border-white/20 bg-[#0F0F10]/60 accent-[#FACC15] focus:ring-2 focus:ring-[#FACC15]/30",
          className,
        )}
        {...props}
      />
      <span className="text-sm text-zinc-300">
        <Check className="pointer-events-none absolute ml-[0.1rem] mt-[-0.95rem] h-3.5 w-3.5 text-black opacity-0 peer-checked:opacity-100" />
      </span>
    </label>
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };
