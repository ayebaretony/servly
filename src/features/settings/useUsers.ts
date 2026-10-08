import { useContext } from "react";
import { UsersContext } from "./UsersContext";

export function useUsers() {
  const value = useContext(UsersContext);
  if (!value) throw new Error("useUsers must be used inside <UsersProvider>.");
  return value;
}
