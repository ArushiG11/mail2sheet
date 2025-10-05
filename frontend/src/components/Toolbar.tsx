export default function Toolbar(props: {
  onRefresh: () => Promise<void>;
  onDownload: () => void;     
  onLogout: () => void;      
  busy?: boolean;
}) {
  const { onRefresh, onDownload, onLogout, busy } = props;
  const btn =
    "px-3 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <div className="flex flex-wrap gap-2 my-3">
      <button className={btn} onClick={onRefresh} disabled={busy}>Refresh Table</button>

      <span className="grow" /> {/* pushes these two to the right */}

      <button className={btn} onClick={onDownload}>Download CSV</button>
      <button className={btn} onClick={onLogout}>Log out</button>
    </div>
  );
}
