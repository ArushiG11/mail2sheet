export type AppDoc = {
    threadId?: string;
    company?: string;
    role?: string;
    status?: string;
    application_date?: string;
    source?: string;
    confidence?: number | string;
  };
  export type StatusResp = {
    ok: boolean;
    gmailConnected: boolean;
    recentSample: number;
    model: string;
  };
  export type RecentResp = { ok: boolean; docs: AppDoc[] };
  