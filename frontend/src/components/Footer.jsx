import { Newspaper } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

export const Footer = () => {
  const { t } = useLang();
  return (
    <footer className="bg-[#0F172A] text-slate-400 mt-12" data-testid="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-[#DC2626] text-white h-10 w-10 grid place-items-center rounded-sm">
              <Newspaper className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl text-white font-bold leading-none">{t("brand")}</h2>
              <p className="text-sm mt-1">{t("tagline")}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t("fetchedIn8h")}</p>
        </div>

        <div className="mt-6 text-xs leading-6 text-slate-400" data-testid="footer-disclaimer">
          <h3 className="text-slate-200 font-semibold mb-1.5">{t("disclaimerTitle")}</h3>
          <p>{t("disclaimerBody")}</p>
          <p className="mt-3 text-slate-300 font-medium">{t("jurisdiction")}</p>
        </div>

        <p className="text-xs mt-6 border-t border-slate-700 pt-4 text-slate-500">
          © {new Date().getFullYear()} गाजियाबाद टाइम्स · {t("rightsReserved")}
        </p>
      </div>
    </footer>
  );
};
