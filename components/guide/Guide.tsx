"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const PILLAR_COLOR: Record<string, string> = {
  lifestyle: "#B8945A",
  health: "#4F7A4A",
  financial: "#3A5C86",
  family: "#5B4B7A",
  relationships: "#5B4B7A",
  growth: "#2F6E6A",
  money: "#B8945A",
  spirit: "#1E3A5F",
};
const PALETTE = ["#B8945A", "#4F7A4A", "#3A5C86", "#5B4B7A", "#2F6E6A", "#1E3A5F"];

function tagFor(name: string) {
  return name.toLowerCase().split(/[\s&]+/)[0];
}
function colorFor(name: string, i: number) {
  return PILLAR_COLOR[tagFor(name)] ?? PALETTE[i % PALETTE.length];
}

export function Guide() {
  const settings = useQuery(api.settings.get, {});
  const mirror = useQuery(api.mirror.current, {});
  const pillars = useQuery(api.pillars.list, {});
  const surfaceId = useQuery(api.surfaces.firstForUser, {});
  const nodes = useQuery(api.nodes.list, surfaceId ? { surfaceId } : "skip");
  const update = useMutation(api.settings.update);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const northStar = settings?.northStar ?? "";
  const values = mirror?.structured.values ?? [];
  const themes = mirror?.structured.themes ?? [];
  const tags = [...values, ...themes];

  const countFor = (name: string) =>
    (nodes ?? []).filter((n) => n.pillars.includes(tagFor(name))).length;

  return (
    <div className="h-full overflow-auto bg-paper">
      <div className="max-w-[720px] mx-auto px-10 pt-11 pb-20">
        <div className="text-[12px] tracking-[0.18em] uppercase text-ink-mute mb-2">
          Your Guide · a draft
        </div>
        <h2 className="text-[30px] tracking-tight text-ink">Who you&apos;re becoming</h2>
        <p className="text-ink-mute text-[15px] mt-1.5">
          This isn&apos;t fixed. It&apos;s what we&apos;ve pieced together from what you&apos;ve put
          in. Edit anything, or just read yourself back.
        </p>

        {/* north star */}
        <div className="bg-card border border-gold rounded-[18px] p-[26px] my-7">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-[11px] tracking-[0.16em] uppercase text-[#8A6A2E]">
              ★ Your north star
            </div>
            {!editing && (
              <button
                onClick={() => {
                  setDraft(northStar);
                  setEditing(true);
                }}
                className="text-xs text-ink-mute hover:text-ink"
              >
                {northStar ? "edit" : "write it"}
              </button>
            )}
          </div>
          {editing ? (
            <div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                placeholder="In your own words: the life you're moving toward…"
                className="w-full bg-paper border border-line rounded-xl p-3 text-[18px] font-medium leading-snug text-ink outline-none resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => {
                    await update({ northStar: draft.trim() });
                    setEditing(false);
                  }}
                  className="bg-ink text-white rounded-lg px-4 py-2 text-sm"
                >
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="text-ink-mute text-sm px-2">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[24px] font-semibold leading-snug text-ink">
              {northStar || (
                <span className="text-ink-mute font-normal text-[18px]">
                  Not named yet. When you&apos;re ready, write the life you&apos;re moving toward, or
                  ask your Coach to help you find the words.
                </span>
              )}
            </div>
          )}
        </div>

        {/* mirror */}
        <div className="bg-coach text-coach-ink rounded-[18px] p-6 mb-7">
          <div className="text-[11px] tracking-[0.16em] uppercase text-gold mb-3">
            The Mirror · what I&apos;ve noticed
          </div>
          {tags.length > 0 ? (
            <div className="flex gap-2 flex-wrap mb-3.5">
              {tags.map((t) => (
                <span key={t} className="bg-coach-soft px-3 py-1.5 rounded-full text-[13px]">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <p className="text-[#C7CBD4] text-sm leading-relaxed">
            {mirror?.summary?.trim()
              ? mirror.summary
              : "I'm still learning who you are. Keep adding what pulls at you to your board, and check in on Today. The picture sharpens fast."}
          </p>
        </div>

        {/* pillars */}
        {(pillars ?? []).map((p, i) => (
          <div key={p._id} className="border-t border-line py-[22px]">
            <div className="flex items-center gap-2.5 mb-3">
              <i
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: colorFor(p.name, i) }}
              />
              <h3 className="text-[18px] text-ink">{p.name}</h3>
              <span className="text-xs text-ink-mute ml-auto">{countFor(p.name)} things</span>
            </div>
            {countFor(p.name) === 0 && (
              <div className="text-[14px] text-ink-mute">
                Nothing tagged here yet. As you capture, ideas land under the pillars they touch.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
