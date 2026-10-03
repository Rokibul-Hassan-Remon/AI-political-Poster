"use client";

// Canvas editor: drag, resize and rotate the poster's parts. The parts are images the server cut out of
// the last render (Poster.layers), so Konva never draws Bangla text itself; on save the server re-renders
// the HTML with the same moves (render.service), so the PNG/PDF match what the user saw here.
import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Image as KImage, Layer, Stage, Transformer } from "react-konva";
import type { LayoutEntry, Poster } from "../../poster-fields";

const W = 1200;
const H = 1600;
const NONE = { dx: 0, dy: 0, scale: 1, rotate: 0 };

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
      width={item.w}
      height={item.h}
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

export default function LayoutEditor({ poster, onSave, onCancel }: { poster: Poster; onSave: (layout: LayoutEntry[]) => Promise<void>; onCancel: () => void }) {
  const { background, items } = poster.layers!;
  const bg = useImage(background);
  const [moves, setMoves] = useState<Record<string, LayoutEntry>>(() => Object.fromEntries((poster.layout ?? []).map((l) => [l.key, l])));
  // Paint order, bottom first; saved as the layout's order (server sets z-index from it).
  const defaultOrder = items.map((i) => i.key);
  const [order, setOrder] = useState(() => {
    const saved = (poster.layout ?? []).map((l) => l.key).filter((k) => defaultOrder.includes(k));
    return [...saved, ...defaultOrder.filter((k) => !saved.includes(k))];
  });
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

  async function save() {
    setBusy(true);
    const r = (n: number, d = 0) => +n.toFixed(d);
    // Round so the values pass the server's zod limits and stay readable in the DB.
    const all = order.map((key) => moves[key] ?? { key, ...NONE });
    await onSave(all.map((m) => ({ key: m.key, dx: r(m.dx), dy: r(m.dy), scale: r(Math.min(4, Math.max(0.2, m.scale)), 3), rotate: r(m.rotate, 1) })));
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
              {order.map((key) => items.find((i) => i.key === key)!).map((item) => (
                <Part
                  key={item.key}
                  item={item}
                  move={moves[item.key] ?? { key: item.key, ...NONE }}
                  onSelect={() => setSelected(item.key)}
                  onChange={(m) => setMoves((ms) => ({ ...ms, [m.key]: m }))}
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
      <div className="flex flex-wrap gap-3">
        <button onClick={save} disabled={busy} className="rounded bg-green-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {busy ? "পাঠানো হচ্ছে…" : "সংরক্ষণ করুন"}
        </button>
        <button
          onClick={() => setOrder((o) => [...o.filter((k) => k !== selected), selected!])}
          disabled={busy || !selected}
          className="rounded border border-green-700 px-4 py-2 font-semibold text-green-700 disabled:opacity-50"
        >
          সামনে আনুন
        </button>
        <button
          onClick={() => {
            setMoves({});
            setOrder(defaultOrder);
          }}
          disabled={busy} className="rounded border border-green-700 px-4 py-2 font-semibold text-green-700">
          আগের মতো করুন
        </button>
        <button onClick={onCancel} disabled={busy} className="px-4 py-2 underline">
          বাতিল
        </button>
      </div>
    </div>
  );
}
