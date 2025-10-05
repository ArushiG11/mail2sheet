import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { clearToken, getToken } from "./lib/session";   
import Toolbar from "./components/Toolbar";
import Table from "./components/Table";
import StatusBar from "./components/StatusBar";
import type { AppDoc, StatusResp } from "./type";
import { useNavigate } from "react-router-dom";


function toCSV(rows: AppDoc[]) {                         // 👈 CSV helper
  const headers = ["Company","Role","Status","Applied","Confidence","Source"];
  const escape = (v: any) => {
    const s = (v ?? "").toString().replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map(r => [
      r.company, r.role, r.status, r.application_date,
      typeof r.confidence === "number" ? `${Math.round(r.confidence*100)}%` : (r.confidence ?? ""),
      r.source
    ].map(escape).join(","))
  ];
  return lines.join("\n");
}

export default function App() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<StatusResp>();
  const [rows, setRows] = useState<AppDoc[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    if (!getToken()) { nav("/"); return; }
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(p = page) {
    try {
      const since = new Date(Date.now() - 7*24*60*60*1000).toISOString();
      const [s, r] = await Promise.all([api.status(), api.recent({ since, page: p, limit })]);
      setStatus(s);
      setRows(r.docs || []);
      setTotal(r.total || 0);
      setPage(r.page || p);
      setLimit(r.limit || limit);
    } catch (e) {
      // optional: toast
    }
  }

  async function onRefresh() {
    setBusy(true);
    try { await api.sync(); await load(); } finally { setBusy(false); }
  }
  const canPrev = page > 1;
  const canNext = page * limit < total;
  async function onPrev() { if (!canPrev) return; await load(page - 1); }
  async function onNext() { if (!canNext) return; await load(page + 1); }

  function onLogout() {                                 
    clearToken();
    nav("/", { replace: true });
  }

  function onDownload() {                                
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `autojobtrack_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Auto Job Tracker</h1>
        <StatusBar data={status} />
      </div>

      <Toolbar
        onRefresh={onRefresh}
        onDownload={onDownload}     
        onLogout={onLogout}          
        busy={busy}
      />

      <Table rows={rows} />

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-neutral-600">
          Page {page} · Showing {rows.length} of {total}
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-xl border border-neutral-300 bg-white disabled:opacity-50" onClick={onPrev} disabled={!canPrev}>Previous</button>
          <button className="px-3 py-2 rounded-xl border border-neutral-300 bg-white disabled:opacity-50" onClick={onNext} disabled={!canNext}>Next</button>
        </div>
      </div>
    </div>
  );
}
