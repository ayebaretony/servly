import { createContext } from "react";
import type { ManagedUser } from "@/types/user";

// off = this person is not an admin, so nothing is loaded
export type UsersState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; users: ManagedUser[] };

export const UsersContext = createContext<UsersState | null>(null);
