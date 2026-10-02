import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, Newspaper } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { mediaUrl, timeAgo } from "@/lib/api";

const CAT_GRADIENTS = {
  rashtriya: "from-orange-500 via-rose-500 to-red-600",
  ghaziabad: "from-red-600 via-rose-600 to-slate-800",
  noida: "from-sky-600 via-blue-600 to-indigo-700",
  "paschim-up": "from-amber-500 via-orange-600 to-red-700",
  "up-sarkar": "from-slate-700 via-slate-800 to-red-800",
  delhi: "from-emerald-600 via-teal-600 to-cyan-700",
  khel: "from-lime-500 via-green-600 to-emerald-700",
  cinema: "from-fuchsia-600 via-purple-600 to-indigo-700",
  shiksha: "from-blue-600 via-indigo-600 to-violet-700",
  swasthya: "from-teal-500 via-emerald-600 to-green-700",
  rozgar: "from-amber-600 via-yellow-600 to-orange-700",
  vyapar: "from-slate-600 via-gray-700 to-slate-900",
  default: "from-red-600 via-rose-600 to-slate-800",
};

export const NewsCard = ({ item, size = "md" }) => {
  const { lang } = useLang();
  const large = size === "lg";
  const src = mediaUrl(item.image_url);
  const [imgOk, setImgOk] = useState(Boolean(src));
  const grad = CAT_GRADIENTS[item.category] || CAT_GRADIENTS.default;

  return (
    <Link to={`/article/${item.id}`} data-testid={`news-card-${item.id}`}
      className="group block bg-white border border-slate-200 rounded-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`relative overflow-hidden ${large ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
        {src && imgOk ? (
          <img src={src} alt={item.title} loading="lazy" onError={() => setImgOk(false)}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${grad} flex flex-col items-center justify-center text-center px-3`}>
            <Newspaper className="absolute h-24 w-24 text-white/10" />
            <span className="relative font-serif font-bold text-white drop-shadow-sm leading-tight text-lg sm:text-xl">{item.category_hi}</span>
            <span className="relative mt-1 text-[10px] tracking-[0.2em] uppercase text-white/80">गाजियाबाद टाइम्स</span>
          </div>
        )}
        <span className="absolute top-2 left-2 z-10 bg-[#DC2626] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm">
          {item.category_hi}
        </span>
      </div>
      <div className="p-3">
        <h3 className={`font-serif font-bold text-slate-900 leading-snug group-hover:text-[#B91C1C] transition-colors ${large ? "text-xl sm:text-2xl" : "text-base"}`}>
          {item.title}
        </h3>
        {large && item.summary && (
          <p className="mt-2 text-sm text-slate-600 line-clamp-2">{item.summary}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
          {item.region && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.region}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(item.published_at, lang)}</span>
        </div>
      </div>
    </Link>
  );
};
