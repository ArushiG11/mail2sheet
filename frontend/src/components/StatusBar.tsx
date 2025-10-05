import type { StatusResp } from "../type";

export default function StatusBar({ data }: { data?: StatusResp }) {
  if (!data) return <div className="text-sm text-neutral-500">Loading status…</div>;
  return (
    <div className="text-sm">
      Gmail:{" "}
      <span className={data.gmailConnected ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
        {data.gmailConnected ? "Connected" : "Not connected"}
      </span>
      <span className="mx-2">•</span>
      Model: <span className="font-medium">{data.model}</span>
      <span className="mx-2">•</span>
      Sample docs: <span className="font-medium">{data.recentSample}</span>
    </div>
  );
}
