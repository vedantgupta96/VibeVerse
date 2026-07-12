import { cn } from "@/lib/utils";
import type { RoomMemberDTO } from "@/lib/dto";

export function PresenceRoster({ members }: { members: RoomMemberDTO[] }) {
  return (
    <section className="glass rounded-lg p-5" aria-labelledby="roster-title">
      <h2
        id="roster-title"
        className="text-xs font-medium uppercase tracking-wide text-stardust"
      >
        Listening now · {members.filter((m) => m.active).length}
      </h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {members.map((member) => (
          <li key={member.userId} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn("size-2 shrink-0 rounded-full", member.active ? "bg-success" : "bg-faint")}
              aria-hidden
            />
            <span className={cn("truncate", member.active ? "text-star" : "text-faint")}>
              {member.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
