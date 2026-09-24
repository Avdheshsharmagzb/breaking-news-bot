import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/context/LanguageContext";

export const BreakingTicker = () => {
  const { t } = useLang();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get("/news/breaking?limit=12").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  if (!items.length) return null;

  return (
    <div className="bg-[#DC2626] text-white overflow-hidden" data-testid="breaking-ticker">
      <div className="mx-auto max-w-6xl flex items-stretch">
        <div className="flex items-center gap-2 bg-[#0F172A] px-4 font-bold text-sm shrink-0">
          <Radio className="h-4 w-4 animate-pulse" /> {t("breaking")}
        </div>
        <div className="relative flex-1 overflow-hidden group">
          <div className="ticker-track whitespace-nowrap py-2 group-hover:[animation-play-state:paused]">
            {[...items, ...items].map((it, i) => (
              <Link key={i} to={`/article/${it.id}`} className="mx-6 text-sm hover:underline inline-flex items-center">
                <span className="text-amber-300 mr-2">●</span>{it.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
