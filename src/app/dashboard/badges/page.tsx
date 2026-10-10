import { redirect } from "next/navigation";

/** Badges live on the Leaderboard page now. */
export default function BadgesPage() {
  redirect("/dashboard/leaderboard#badges");
}
