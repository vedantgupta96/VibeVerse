import { PlaylistDetail } from "@/components/playlists/PlaylistDetail";

export const metadata = { title: "Playlist · VibeVerse" };

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlaylistDetail id={id} />;
}
