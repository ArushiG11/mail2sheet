import type { AppDoc } from "../type";
import { useMemo, useState } from "react";

export default function Table({ rows }: { rows: AppDoc[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      [r.company, r.role, r.status, r.application_date, r.threadId]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(s))
    );
  }, [q, rows]);

  return (
    <div className="mt-4">
      <input
        className="w-full md:w-80 border border-neutral-300 rounded-xl px-3 py-2"
        placeholder="Search company / role / status…"
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      <div className="overflow-x-auto mt-3 rounded-2xl border border-neutral-200">
        <table className="min-w-full">
          <thead className="bg-neutral-50">
            <tr>
              {["Company","Role","Status","Applied","Confidence"].map(h => (
                <th key={h} className="text-left text-sm font-semibold text-neutral-700 px-3 py-2 border-b">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500">No rows to display</td></tr>
            )}
            {filtered.map((d, i) => (
              <tr key={d.threadId ?? i} className="odd:bg-white even:bg-neutral-50">
                <td className="px-3 py-2">{d.company || ""}</td>
                <td className="px-3 py-2">{d.role || ""}</td>
                <td className="px-3 py-2">{d.status || ""}</td>
                <td className="px-3 py-2">{d.application_date || ""}</td>
                <td className="px-3 py-2">
                  {typeof d.confidence === "number"
                    ? `${Math.round(d.confidence * 100)}%`
                    : (d.confidence ?? "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
