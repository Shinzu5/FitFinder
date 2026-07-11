import * as React from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  checked?: boolean;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={cn(
          "h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border border-[#FFD700] bg-transparent checked:bg-[#FFD700] checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22%23000%22%3E%3Cpath%20d%3D%22M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%22%2F%3E%3C%2Fsvg%3E')] checked:bg-center checked:bg-no-repeat focus:outline-none focus:ring-2 focus:ring-[#FFD700]/30",
          className,
        )}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
