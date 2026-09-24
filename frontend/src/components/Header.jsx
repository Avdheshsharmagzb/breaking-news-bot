import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Languages, Menu, ShieldCheck, Newspaper } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const { lang, toggle, t } = useLang();
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [params] = useSearchParams();
  const activeCat = params.get("cat") || "all";
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/categories").then((r) => setCats(r.data)).catch(() => {});
  }, []);

  const today = new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const go = (key) => {
    navigate(key === "all" ? "/" : `/?cat=${key}`);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-50" data-testid="site-header">
      <div className="bg-[#0F172A] text-slate-300 text-xs">
        <div className="mx-auto max-w-6xl px-4 py-1.5 flex items-center justify-between">
          <span data-testid="header-date">{today}</span>
          <div className="flex items-center gap-3">
            <Link to="/admin" className="hover:text-white inline-flex items-center gap-1" data-testid="header-admin-link">
              <ShieldCheck className="h-3.5 w-3.5" /> {t("admin")}
            </Link>
            <button
              onClick={toggle}
              data-testid="language-toggle"
              className="inline-flex items-center gap-1 rounded-full border border-slate-600 px-2.5 py-0.5 hover:bg-white hover:text-[#0F172A] transition-colors"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "hi" ? "English" : "हिंदी"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#FAF9F6] border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="header-brand">
            <div className="bg-[#DC2626] text-white h-11 w-11 grid place-items-center rounded-sm">
              <Newspaper className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl leading-none text-[#B91C1C] tracking-tight">
                {t("brand")}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">{t("tagline")}</p>
            </div>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} data-testid="mobile-menu-btn">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <nav className="bg-[#B91C1C] text-white" data-testid="category-nav">
        <div className={`mx-auto max-w-6xl px-4 ${open ? "block" : "hidden"} md:block`}>
          <ul className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-x-1 py-1">
            <li>
              <button onClick={() => go("all")} data-testid="nav-cat-all"
                className={`px-3 py-2 text-sm font-semibold rounded-sm transition-colors hover:bg-white/15 ${activeCat === "all" ? "bg-white/20" : ""}`}>
                {t("all")}
              </button>
            </li>
            {cats.map((c) => (
              <li key={c.key}>
                <button onClick={() => go(c.key)} data-testid={`nav-cat-${c.key}`}
                  className={`px-3 py-2 text-sm font-semibold rounded-sm transition-colors hover:bg-white/15 ${activeCat === c.key ? "bg-white/20" : ""}`}>
                  {lang === "hi" ? c.hi : c.en}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
};
