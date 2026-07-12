import { RoomExperience } from "@/components/rooms/RoomExperience";

export const metadata = { title: "Vibe Room · VibeVerse" };

export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoomExperience roomId={id} />;
}
