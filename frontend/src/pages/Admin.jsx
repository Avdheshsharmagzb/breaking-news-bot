import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  RefreshCw, Check, X, Pencil, Trash2, Sparkles, Upload, PenLine, ArrowLeft, Clock, MapPin, Newspaper,
} from "lucide-react";
import { api, mediaUrl, timeAgo } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

const STATUS = { Pending_Review: "pending", Approved: "approved", Rejected: "rejected" };

export default function Admin() {
  const { t, lang } = useLang();
  const [tab, setTab] = useState("Pending_Review");
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [sources, setSources] = useState([]);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [cats, setCats] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timer = useRef(null);

  const loadStats = useCallback(() => api.get("/admin/stats").then((r) => setStats(r.data)), []);
  const loadItems = useCallback(() => {
    api.get(`/admin/news?status=${tab}&source=${sourceFilter}&limit=200`).then((r) => setItems(r.data));
  }, [tab, sourceFilter]);

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data));
    api.get("/admin/sources").then((r) => setSources(r.data));
  }, []);
  useEffect(() => { loadItems(); loadStats(); }, [loadItems, loadStats]);

  useEffect(() => {
    if (autoRefresh) {
      timer.current = setInterval(() => { loadItems(); loadStats(); }, 20000);
    }
    return () => clearInterval(timer.current);
  }, [autoRefresh, loadItems, loadStats]);

  const doFetch = async () => {
    setFetching(true);
    try {
      const r = await api.post("/admin/fetch");
      toast.success(`${r.data.inserted} नई खबरें जोड़ी गईं`);
      api.get("/admin/sources").then((res) => setSources(res.data));
      loadItems(); loadStats();
    } catch {
      toast.error("खबरें लाने में समस्या हुई");
    } finally { setFetching(false); }
  };

  const setStatus = async (id, status) => {
    await api.patch(`/admin/news/${id}/status?status=${status}`);
    setItems((prev) => prev.filter((x) => x.id !== id));
    loadStats();
    toast.success(status === "Approved" ? t("approved") : status === "Rejected" ? t("rejected") : "OK");
  };

  const remove = async (id) => {
    await api.delete(`/admin/news/${id}`);
    setItems((prev) => prev.filter((x) => x.id !== id));
    loadStats();
    toast.success(t("delete"));
  };

  return (
    <div className="min-h-screen bg-[#F1F0EC]">
      <div className="bg-[#0F172A] text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#DC2626] h-9 w-9 grid place-items-center rounded-sm"><Newspaper className="h-5 w-5" /></div>
            <div>
              <h1 className="font-serif font-bold text-xl">{t("dashboard")}</h1>
              <p className="text-xs text-slate-400">गाजियाबाद टाइम्स</p>
            </div>
          </div>
          <Link to="/" className="text-sm text-slate-300 hover:text-white inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> {t("home")}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-testid="admin-stats">
          <Kpi label={t("pending")} value={stats.pending} color="text-amber-600" />
          <Kpi label={t("approved")} value={stats.approved} color="text-emerald-600" />
          <Kpi label={t("rejected")} value={stats.rejected} color="text-rose-600" />
          <Kpi label={t("total")} value={stats.total} color="text-slate-800" />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between mb-4">
          <Button onClick={doFetch} disabled={fetching} data-testid="fetch-now-btn" className="bg-[#DC2626] hover:bg-[#B91C1C] gap-2">
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? t("fetching") : t("fetchNow")}
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} data-testid="auto-refresh-switch" />
              <Label htmlFor="auto" className="text-sm">{t("autoRefresh")}</Label>
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[180px] bg-white" data-testid="source-filter"><SelectValue placeholder={t("sourceFilter")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all")}</SelectItem>
                {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <ComposeDialog cats={cats} onDone={() => { loadItems(); loadStats(); }} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white" data-testid="status-tabs">
            <TabsTrigger value="Pending_Review" data-testid="tab-pending">{t("pending")} ({stats.pending})</TabsTrigger>
            <TabsTrigger value="Approved" data-testid="tab-approved">{t("approved")} ({stats.approved})</TabsTrigger>
            <TabsTrigger value="Rejected" data-testid="tab-rejected">{t("rejected")} ({stats.rejected})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 space-y-3" data-testid="admin-news-list">
          {items.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-sm border border-slate-200">
              {t("noNews")}
            </div>
          ) : items.map((it) => (
            <AdminRow key={it.id} item={it} lang={lang} t={t} cats={cats}
              onStatus={setStatus} onRemove={remove} onEdited={loadItems} />
          ))}
        </div>
      </div>
    </div>
  );
}

const Kpi = ({ label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-sm px-4 py-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

const AdminRow = ({ item, lang, t, cats, onStatus, onRemove, onEdited }) => {
  const image = mediaUrl(item.image_url);
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-3 flex gap-3" data-testid={`admin-row-${item.id}`}>
      {image && <img src={image} alt="" className="h-24 w-32 object-cover rounded-sm shrink-0 hidden sm:block" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mb-1">
          <span className="bg-[#FEF2F2] text-[#B91C1C] font-semibold px-2 py-0.5 rounded-sm">{item.category_hi}</span>
          {item.region && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.region}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(item.published_at, lang)}</span>
          <span>· {item.source}</span>
          {item.is_manual && <span className="text-[#B91C1C] font-semibold">✎ {t("manual")}</span>}
        </div>
        <h3 className="font-serif font-bold text-slate-900 leading-snug">{item.title}</h3>
        <p className="text-sm text-slate-600 line-clamp-2 mt-1">{item.summary}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {item.status !== "Approved" && (
            <Button size="sm" onClick={() => onStatus(item.id, "Approved")} data-testid={`approve-${item.id}`} className="h-8 bg-emerald-600 hover:bg-emerald-700 gap-1">
              <Check className="h-3.5 w-3.5" />{t("approve")}
            </Button>
          )}
          {item.status !== "Rejected" && (
            <Button size="sm" variant="outline" onClick={() => onStatus(item.id, "Rejected")} data-testid={`reject-${item.id}`} className="h-8 gap-1 text-rose-600 border-rose-200 hover:bg-rose-50">
              <X className="h-3.5 w-3.5" />{t("reject")}
            </Button>
          )}
          <EditDialog item={item} cats={cats} t={t} onEdited={onEdited} />
          <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)} data-testid={`delete-${item.id}`} className="h-8 gap-1 text-slate-400 hover:text-rose-600">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const EditDialog = ({ item, cats, t, onEdited }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: item.title, summary: item.summary, content: item.content, category: item.category });
  const save = async () => {
    await api.patch(`/admin/news/${item.id}`, form);
    toast.success(t("save"));
    setOpen(false); onEdited();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1" data-testid={`edit-${item.id}`}><Pencil className="h-3.5 w-3.5" />{t("edit")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("edit")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("fTitle")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="edit-title" /></div>
          <div><Label>{t("fSummary")}</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} data-testid="edit-summary" /></div>
          <div><Label>{t("fContent")}</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} data-testid="edit-content" /></div>
          <div><Label>{t("fCategory")}</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger data-testid="edit-category"><SelectValue /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c.key} value={c.key}>{c.hi}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={save} data-testid="edit-save" className="bg-[#DC2626] hover:bg-[#B91C1C]">{t("save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ComposeDialog = ({ cats, onDone }) => {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", content: "", category: "ghaziabad", region: "गाजियाबाद", image_url: null });
  const [enhancing, setEnhancing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  const reset = () => { setForm({ title: "", summary: "", content: "", category: "ghaziabad", region: "गाजियाबाद", image_url: null }); setAiDone(false); };

  const enhance = async () => {
    if (!form.title && !form.content) { toast.error("शीर्षक या विवरण भरें"); return; }
    setEnhancing(true);
    try {
      const r = await api.post("/admin/enhance", { title: form.title, content: form.content });
      setForm((f) => ({ ...f, title: r.data.title, summary: r.data.summary, content: r.data.content }));
      setAiDone(true);
      toast.success("AI ने पत्रकारिता स्तर पर सुधार कर दिया");
    } catch { toast.error("AI सुधार विफल"); } finally { setEnhancing(false); }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, image_url: r.data.image_url }));
      toast.success(t("watermarkNote"));
    } catch { toast.error("अपलोड विफल"); } finally { setUploading(false); }
  };

  const submit = async () => {
    if (!form.title || !form.content) { toast.error("शीर्षक और विवरण आवश्यक हैं"); return; }
    await api.post("/admin/news/manual", { ...form, ai_enhanced: aiDone });
    toast.success("खबर समीक्षा में भेज दी गई");
    setOpen(false); reset(); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="bg-[#0F172A] hover:bg-[#1e293b] gap-2" data-testid="compose-btn"><PenLine className="h-4 w-4" />{t("compose")}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("composeTitle")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("fTitle")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="compose-title" /></div>
          <div><Label>{t("fContent")}</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="अपनी खबर यहाँ कॉपी-पेस्ट करें..." data-testid="compose-content" /></div>
          <Button type="button" variant="outline" onClick={enhance} disabled={enhancing} className="w-full gap-2 border-[#D97706] text-[#B45309] hover:bg-amber-50" data-testid="ai-enhance-btn">
            <Sparkles className={`h-4 w-4 ${enhancing ? "animate-pulse" : ""}`} />{enhancing ? t("enhancing") : t("aiEnhance")}
          </Button>
          {form.summary && <div><Label>{t("fSummary")}</Label><Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} data-testid="compose-summary" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("fCategory")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="compose-category"><SelectValue /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.key} value={c.key}>{c.hi}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>{t("fRegion")}</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} data-testid="compose-region" /></div>
          </div>
          <div>
            <Label>{t("fPhoto")}</Label>
            <label className="mt-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-sm py-4 cursor-pointer hover:border-[#DC2626] transition-colors" data-testid="compose-upload-label">
              <Upload className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-500">{uploading ? "..." : t("fPhoto")}</span>
              <input type="file" accept="image/*" onChange={upload} className="hidden" data-testid="compose-upload-input" />
            </label>
            {form.image_url && <img src={mediaUrl(form.image_url)} alt="" className="mt-2 w-full rounded-sm border border-slate-200" data-testid="compose-image-preview" />}
          </div>
        </div>
        <DialogFooter><Button onClick={submit} className="bg-[#DC2626] hover:bg-[#B91C1C]" data-testid="compose-submit">{t("publish")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
