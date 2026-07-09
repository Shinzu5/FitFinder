import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { hydrate, ...rest } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return rest;
}
