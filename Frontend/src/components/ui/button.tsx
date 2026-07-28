import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
}

const buttonVariants = {
  default: "bg-[#FACC15] text-black hover:bg-[#EAB308]",
  outline: "border border-white/15 bg-white/5 text-white hover:bg-white/10",
  ghost: "bg-transparent text-zinc-300 hover:bg-white/10 hover:text-white",
  secondary: "bg-white/10 text-white hover:bg-white/15",
};

const buttonSizes = {
  default: "h-11 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-12 px-6 text-base",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#FACC15]/40 disabled:cursor-not-allowed disabled:opacity-60",
          buttonVariants[variant],
          buttonSizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
