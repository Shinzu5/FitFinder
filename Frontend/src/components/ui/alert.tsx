import * as React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "destructive";
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant = "default", children, ...props }, ref) => {
  const styles = {
    default: "border-white/10 bg-white/5 text-zinc-100",
    success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    destructive: "border-red-400/20 bg-red-500/10 text-red-100",
  };

  const iconMap = {
    default: <Info className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
    destructive: <AlertCircle className="h-4 w-4" />,
  };

  return (
    <div ref={ref} role="alert" className={cn("flex items-start gap-3 rounded-2xl border p-4 text-sm", styles[variant], className)} {...props}>
      <div className="mt-0.5">{iconMap[variant]}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
});

Alert.displayName = "Alert";

export { Alert };
