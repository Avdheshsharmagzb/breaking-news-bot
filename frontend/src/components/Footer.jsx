import { useLang } from "@/context/LanguageContext";

export const Footer = () => {
  const { t } = useLang();
  return (
    <footer className="bg-[#0F172A] text-slate-400 mt-12" data-testid="site-footer">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-serif text-2xl text-white font-bold">{t("brand")}</h2>
        <p className="text-sm mt-2">{t("tagline")}</p>
        <p className="text-xs mt-6 border-t border-slate-700 pt-4">
          © {new Date().getFullYear()} गाजियाबाद टाइम्स · {t("fetchedIn8h")}
        </p>
      </div>
    </footer>
  );
};
