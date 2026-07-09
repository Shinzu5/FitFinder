import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-white/15 bg-[#0F0F10]/90 px-4 py-3 text-sm text-white outline-none transition focus:border-[#FACC15]/60 focus:ring-2 focus:ring-[#FACC15]/25",
        className,
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };
