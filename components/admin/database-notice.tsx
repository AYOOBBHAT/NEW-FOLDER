import { logDatabaseFailure } from "@/lib/mongodb";

export function adminDatabaseNotice(error: unknown) {
  logDatabaseFailure(error);
  return <p>The catalogue database is unavailable.</p>;
}
