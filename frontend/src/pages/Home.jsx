import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreakingTicker } from "@/components/BreakingTicker";
import { NewsCard } from "@/components/NewsCard";
import { Newspaper } from "lucide-react";

export default function Home() {
  const { t, lang } = useLang();
  const [params] = useSearchParams();
  const cat = params.get("cat") || "all";
  const [news, setNews] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/news?category=${cat}&limit=80`),
      api.get("/categories"),
    ]).then(([n, c]) => {
      setNews(n.data);
      setCats(c.data);
    }).finally(() => setLoading(false));
  }, [cat]);

  const grouped = useMemo(() => {
    const map = {};
    news.forEach((it) => { (map[it.category] ||= []).push(it); });
    return map;
  }, [news]);

  const hero = news[0];
  const secondary = news.slice(1, 5);

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <Header />
      <BreakingTicker />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <div className="py-24 text-center text-slate-400">…</div>
        ) : news.length === 0 ? (
          <div className="py-24 text-center" data-testid="empty-state">
            <Newspaper className="h-10 w-10 mx-auto text-slate-300" />
            <p className="mt-4 text-slate-500">{t("noNews")}</p>
            <p className="mt-1 text-xs text-slate-400">{t("fetchedIn8h")}</p>
          </div>
        ) : cat !== "all" ? (
          <>
            <SectionTitle title={cats.find((c) => c.key === cat)?.[lang === "hi" ? "hi" : "en"] || ""} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="category-grid">
              {news.map((it) => <NewsCard key={it.id} item={it} />)}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
              <div className="lg:col-span-2">{hero && <NewsCard item={hero} size="lg" />}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {secondary.map((it) => <NewsCard key={it.id} item={it} />)}
              </div>
            </div>
            {cats.map((c) => (
              grouped[c.key]?.length ? (
                <section key={c.key} className="mb-8" data-testid={`section-${c.key}`}>
                  <SectionTitle title={lang === "hi" ? c.hi : c.en} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {grouped[c.key].slice(0, 4).map((it) => <NewsCard key={it.id} item={it} />)}
                  </div>
                </section>
              ) : null
            ))}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

const SectionTitle = ({ title }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="h-6 w-1.5 bg-[#DC2626] rounded-full" />
    <h2 className="font-serif font-bold text-2xl text-slate-900">{title}</h2>
    <span className="flex-1 border-b border-slate-200" />
  </div>
);
