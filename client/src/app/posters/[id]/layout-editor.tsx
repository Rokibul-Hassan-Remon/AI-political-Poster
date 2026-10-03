"use client";

// Canvas editor: drag, resize and rotate the poster's parts. The parts are images the server cut out of
// the last render (Poster.layers), so Konva never draws Bangla text itself; on save the server re-renders
// the HTML with the same moves (render.service), so the PNG/PDF match what the user saw here.
import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Image as KImage, Layer, Stage, Transformer } from "react-konva";
import type { LayoutEntry, PhotoShape, Poster, TextColors } from "../../poster-fields";

const W = 1200;
const H = 1600;
const NONE = { dx: 0, dy: 0, scale: 1, rotate: 0 };
const COLOR_PARTS: [keyof TextColors, string][] = [
  ["headline", "শিরোনাম"],
  ["name", "নাম"],
  ["meta", "পদবি ও এলাকা"],
];
const SHAPES: [PhotoShape | "", string][] = [
  ["", "টেমপ্লেটের ফ্রেম"],
  ["circle", "গোল"],
  ["square", "চৌকো"],
  ["portrait", "লম্বা (৩:৪)"],
  ["landscape", "চওড়া (৪:৩)"],
];
// Height per width of each shape, for the live preview (server: render.service SHAPE_CSS).
const RATIO: Record<PhotoShape, number> = { circle: 1, square: 1, portrait: 4 / 3, landscape: 3 / 4 };
const LAYER_PAD = 60; // transparent margin around each cut-out (server: render.service LAYER_PAD)
const photoLabel = (key: string) => `ছবি ${"১২৩"[+key.slice(5)]}`;

function useImage(src: string) {
  const [img, setImg] = useState<HTMLImageElement>();
  useEffect(() => {
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);
  return img;
}

type Item = NonNullable<Poster["layers"]>["items"][number];

function Part({ item, move, onSelect, onChange }: { item: Item; move: LayoutEntry; onSelect: () => void; onChange: (m: LayoutEntry) => void }) {
  const img = useImage(item.url);
  // Live shape preview: crop the cut-out to the shape's ratio around its center and round the corners.
  // ponytail: approximate (crops the template's border too); saving re-cuts the layer with the real frame.
  const shape = item.key.startsWith("photo") ? move.shape : undefined;
  let [w, h, ox, oy] = [item.w, item.h, 0, 0];
  if (shape) {
    // Shape the photo itself, not the transparent padding around the cut-out.
    // ponytail: assumes full padding; a photo touching the poster edge has less (server clamps it).
    [w, h, ox, oy] = [w - 2 * LAYER_PAD, h - 2 * LAYER_PAD, LAYER_PAD, LAYER_PAD];
    const r = RATIO[shape];
    if (w * r <= h) [oy, h] = [oy + (h - w * r) / 2, w * r];
    else [ox, w] = [ox + (w - h / r) / 2, h / r];
  }
  // Read the node back after a drag/transform: position is relative to the part's place in the template.
  const save = (e: Konva.KonvaEventObject<Event>) => {
    const n = e.target;
    onChange({ key: item.key, dx: n.x() - item.x, dy: n.y() - item.y, scale: n.scaleX(), rotate: n.rotation() });
  };
  return (
    <KImage
      id={item.key}
      image={img}
      x={item.x + move.dx}
      y={item.y + move.dy}
      // Draw the cropped part at its place in the cut-out, but keep scaling/rotating around the cut-out corner like the server.
      offsetX={-ox}
      offsetY={-oy}
      width={w}
      height={h}
      crop={shape && { x: ox, y: oy, width: w, height: h }}
      cornerRadius={shape === "circle" ? w / 2 : shape ? 24 : 0}
      scaleX={move.scale}
      scaleY={move.scale}
      rotation={move.rotate}
      draggable
      onMouseDown={onSelect}
      onTap={onSelect}
      onDragEnd={save}
      onTransformEnd={save}
    />
  );
}

export default function LayoutEditor({
  poster,
  onSave,
  onCancel,
}: {
  poster: Poster;
  onSave: (layout: LayoutEntry[], textColors: TextColors) => Promise<void>;
  onCancel: () => void;
}) {
  const { background, items } = poster.layers!;
  const bg = useImage(background);
  const [moves, setMoves] = useState<Record<string, LayoutEntry>>(() => Object.fromEntries((poster.layout ?? []).map((l) => [l.key, l])));
  // Paint order, bottom first; saved as the layout's order (server sets z-index from it).
  const defaultOrder = items.map((i) => i.key);
  const [order, setOrder] = useState(() => {
    const saved = (poster.layout ?? []).map((l) => l.key).filter((k) => defaultOrder.includes(k));
    return [...saved, ...defaultOrder.filter((k) => !saved.includes(k))];
  });
  const [colors, setColors] = useState<TextColors>(() => ({ ...poster.textColors }));
  const [selected, setSelected] = useState<string>();
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const tr = useRef<Konva.Transformer>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const node = selected ? stage.current?.findOne(`#${selected}`) : undefined;
    tr.current?.nodes(node ? [node] : []);
  }, [selected, width]);

  const k = width / W;
  const moveOf = (key: string) => moves[key] ?? { key, ...NONE };
  // Merge so a drag doesn't drop the part's shape/hidden flags.
  const patch = (key: string, p: Partial<LayoutEntry>) => setMoves((ms) => ({ ...ms, [key]: { ...(ms[key] ?? { key, ...NONE }), ...p } }));
  const hiddenPhotos = order.filter((key) => key.startsWith("photo") && moves[key]?.hidden);
  const selectedPhoto = selected?.startsWith("photo") ? selected : undefined;

  async function save() {
    setBusy(true);
    const r = (n: number, d = 0) => +n.toFixed(d);
    // Round so the values pass the server's zod limits and stay readable in the DB.
    await onSave(
      order.map(moveOf).map((m) => ({ ...m, dx: r(m.dx), dy: r(m.dy), scale: r(Math.min(4, Math.max(0.2, m.scale)), 3), rotate: r(m.rotate, 1) })),
      colors,
    );
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={box} className="w-full touch-none overflow-hidden rounded border">
        {width > 0 && (
          <Stage
            ref={stage}
            width={width}
            height={H * k}
            scaleX={k}
            scaleY={k}
            onMouseDown={(e) => e.target === e.target.getStage() && setSelected(undefined)}
            onTouchStart={(e) => e.target === e.target.getStage() && setSelected(undefined)}
          >
            <Layer>
              {bg && <KImage image={bg} width={W} height={H} listening={false} />}
              {order.filter((key) => !moves[key]?.hidden).map((key) => items.find((i) => i.key === key)!).map((item) => (
                <Part
                  key={item.key}
                  item={item}
                  move={moveOf(item.key)}
                  onSelect={() => setSelected(item.key)}
                  onChange={(m) => patch(m.key, m)}
                />
              ))}
              <Transformer
                ref={tr}
                keepRatio
                enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
                rotationSnaps={[0, 90, 180, 270]}
                boundBoxFunc={(old, b) => (b.width < 40 || b.height < 40 ? old : b)}
              />
            </Layer>
          </Stage>
        )}
      </div>
      <p className="text-sm text-gray-500">যেকোনো অংশ ধরে টেনে সরান। ক্লিক করলে কোণা টেনে বড়-ছোট আর ওপরের গোল বিন্দু দিয়ে ঘোরানো যাবে।</p>
      {/* Photo shape / remove: the canvas previews the shape; saving re-cuts the layer with the template's real frame. */}
      {(selectedPhoto || hiddenPhotos.length > 0) && (
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
          <legend className="px-1 font-semibold text-neutral-700">ছবি</legend>
          {selectedPhoto && (
            <>
              <label className="flex items-center gap-1.5">
                {photoLabel(selectedPhoto)}-এর আকৃতি
                <select
                  value={moveOf(selectedPhoto).shape ?? ""}
                  onChange={(e) => patch(selectedPhoto, { shape: (e.target.value || undefined) as PhotoShape | undefined })}
                  disabled={busy}
                  className="rounded border border-neutral-300 bg-white px-1.5 py-1"
                >
                  {SHAPES.map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  patch(selectedPhoto, { hidden: true });
                  setSelected(undefined);
                }}
                disabled={busy}
                className="flex items-center gap-1 rounded border border-red-600 px-2 py-1 font-semibold text-red-600 hover:bg-red-50"
              >
                {/* Trash can: take the photo off the poster. */}
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                </svg>
                ছবিটি সরান
              </button>
            </>
          )}
          {hiddenPhotos.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => patch(key, { hidden: false })}
              disabled={busy}
              className="flex items-center gap-1 rounded border border-green-700 px-2 py-1 text-green-700 hover:bg-green-50"
            >
              {/* Picture with a plus: put the photo back on the poster. */}
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M4 16l5-5 9 9M19 3v6M16 6h6" />
              </svg>
              {photoLabel(key)} ফেরত আনুন
            </button>
          ))}
          <p className="w-full text-xs text-neutral-500">এখানে আকৃতির আন্দাজ দেখা যাচ্ছে; ফ্রেমসহ আসল চেহারা সংরক্ষণ করার পর আসবে।</p>
        </fieldset>
      )}
      {/* Text colors: the canvas shows images of the last render, so a new color shows after saving. */}
      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
        <legend className="px-1 font-semibold text-neutral-700">লেখার রং</legend>
        {COLOR_PARTS.map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <input
              type="color"
              aria-label={`${label}-এর রং`}
              value={colors[key] ?? "#ffffff"}
              onChange={(e) => setColors((c) => ({ ...c, [key]: e.target.value }))}
              disabled={busy}
              className="h-7 w-9 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
            />
            <span>{label}</span>
            {colors[key] ? (
              <button
                type="button"
                title="টেমপ্লেটের রঙে ফেরান"
                aria-label={`${label}: টেমপ্লেটের রঙে ফেরান`}
                onClick={() => setColors((c) => ({ ...c, [key]: undefined }))}
                disabled={busy}
                className="rounded px-1 text-neutral-500 hover:bg-neutral-200"
              >
                ✕
              </button>
            ) : (
              <span className="text-xs text-neutral-400">(টেমপ্লেটের)</span>
            )}
          </div>
        ))}
        <p className="w-full text-xs text-neutral-500">নতুন রং সংরক্ষণ করার পর পোস্টারে দেখা যাবে।</p>
      </fieldset>
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={save} disabled={busy} className="flex items-center gap-1 whitespace-nowrap rounded bg-green-700 px-2.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {/* Check mark. */}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l5 5L20 6" />
          </svg>
          {busy ? "পাঠানো হচ্ছে…" : "সংরক্ষণ করুন"}
        </button>
        <button
          onClick={() => setOrder((o) => [...o.filter((k) => k !== selected), selected!])}
          disabled={busy || !selected}
          className="flex items-center gap-1 whitespace-nowrap rounded border border-green-700 px-2.5 py-2 text-[13px] font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          {/* Two stacked layers, the top one highlighted. */}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="9" width="12" height="12" rx="2" />
            <rect x="9" y="3" width="12" height="12" rx="2" fill="currentColor" fillOpacity="0.25" />
          </svg>
          সামনে আনুন
        </button>
        <button
          onClick={() => {
            setMoves({});
            setOrder(defaultOrder);
            setColors({});
          }}
          disabled={busy} className="flex items-center gap-1 whitespace-nowrap rounded border border-green-700 px-2.5 py-2 text-[13px] font-semibold text-green-700 hover:bg-green-50">
          {/* Counter-clockwise arrow: undo all moves. */}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
          </svg>
          আগের মতো করুন
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex items-center gap-1 whitespace-nowrap rounded border border-neutral-400 px-2.5 py-2 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-100"
        >
          {/* Cross: close without saving. */}
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          বাতিল
        </button>
      </div>
    </div>
  );
}
