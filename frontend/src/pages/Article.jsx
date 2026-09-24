import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { api, mediaUrl, timeAgo } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function Article() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get(`/news/${id}`).then((r) => setItem(r.data)).catch(() => setErr(true));
  }, [id]);

  if (err) return (
    <div className="min-h-screen bg-[#FAF9F6]"><Header /><div className="py-24 text-center text-slate-500">News not found</div><Footer /></div>
  );
  if (!item) return <div className="min-h-screen bg-[#FAF9F6]"><Header /><div className="py-24 text-center text-slate-400">…</div></div>;

  const image = mediaUrl(item.image_url);

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6" data-testid="article-page">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#B91C1C] mb-4">
          <ArrowLeft className="h-4 w-4" /> {t("home")}
        </Link>
        <span className="inline-block bg-[#DC2626] text-white text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm mb-3">
          {item.category_hi}
        </span>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl leading-tight text-slate-900" data-testid="article-title">
          {item.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-b border-slate-200 pb-4">
          {item.region && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.region}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{timeAgo(item.published_at, lang)}</span>
          <span>{t("source")}: {item.source}</span>
          {item.is_manual && <span className="inline-flex items-center gap-1 text-[#B91C1C]"><ShieldCheck className="h-3.5 w-3.5" />{t("manual")}</span>}
        </div>

        {image && (
          <figure className="mt-5">
            <img src={image} alt={item.title} className="w-full rounded-sm border border-slate-200" data-testid="article-image" />
          </figure>
        )}

        <article className="mt-5 space-y-4 text-[17px] leading-8 text-slate-800" data-testid="article-content">
          {(item.content || item.summary).split("\n").filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>

        {item.source_url && (
          <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-6" data-testid="article-source-link">
            <Button variant="outline" className="gap-2"><ExternalLink className="h-4 w-4" />{t("originalSource")}</Button>
          </a>
        )}
      </main>
      <Footer />
    </div>
  );
}
