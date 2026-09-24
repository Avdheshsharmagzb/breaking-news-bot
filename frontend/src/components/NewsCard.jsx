import { Link } from "react-router-dom";
import { MapPin, Clock } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { mediaUrl, timeAgo } from "@/lib/api";

const PLACEHOLDERS = {
  rashtriya: "https://images.pexels.com/photos/19883686/pexels-photo-19883686.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  ghaziabad: "https://images.unsplash.com/photo-1564506414752-a73fbe0c6b00?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
  noida: "https://images.unsplash.com/photo-1564506414752-a73fbe0c6b00?crop=entropy&cs=srgb&fm=jpg&q=85&w=940",
  "up-sarkar": "https://images.pexels.com/photos/2573473/pexels-photo-2573473.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "paschim-up": "https://images.pexels.com/photos/2573473/pexels-photo-2573473.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  default: "https://images.pexels.com/photos/158651/news-newsletter-newspaper-information-158651.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
};

const img = (item) => mediaUrl(item.image_url) || PLACEHOLDERS[item.category] || PLACEHOLDERS.default;

export const NewsCard = ({ item, size = "md" }) => {
  const { lang } = useLang();
  const large = size === "lg";

  return (
    <Link to={`/article/${item.id}`} data-testid={`news-card-${item.id}`}
      className="group block bg-white border border-slate-200 rounded-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`relative overflow-hidden ${large ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
        <img src={img(item)} alt={item.title} loading="lazy"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <span className="absolute top-2 left-2 bg-[#DC2626] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm">
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
