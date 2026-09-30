import { redirect } from "next/navigation";

// Rating now lives on the unified talk page. Old links/bookmarks land here.
export default async function RateTalkRedirect({ params }: { params: Promise<{ talkId: string }> }) {
  const { talkId } = await params;
  redirect(`/dashboard/talks/${talkId}/present`);
}
