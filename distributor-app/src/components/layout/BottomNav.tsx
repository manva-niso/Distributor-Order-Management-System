"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, MessageSquare, ShoppingCart, Receipt } from "lucide-react";
import { TRADE_DICT, Language } from "@/lib/i18n/trade-dict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface BottomNavProps {
  cartItemCount?: number;
  lang?: Language;
  activeTab?: "catalogue" | "quick-order" | "cart" | "orders";
}

export function BottomNav({ cartItemCount = 0, lang: propLang, activeTab }: BottomNavProps) {
  const { lang: contextLang } = useLanguage();
  const effectiveLang = propLang || contextLang || "en";
  const pathname = usePathname();
  const t = TRADE_DICT[effectiveLang];

  const navItems = [
    {
      label: t.navCatalogue,
      path: "/catalogue",
      icon: Store,
    },
    {
      label: t.navQuickOrder,
      path: "/quick-order",
      icon: MessageSquare,
    },
    {
      label: t.navCart,
      path: "/cart",
      icon: ShoppingCart,
      badge: cartItemCount,
    },
    {
      label: t.navOrders,
      path: "/orders",
      icon: Receipt,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-transparent pointer-events-none pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md md:max-w-xl lg:max-w-2xl mx-auto flex items-center justify-around h-16 px-2 bg-white/95 backdrop-blur-md border-t border-x sm:border-slate-200 shadow-xl pointer-events-auto sm:rounded-t-2xl">
        {navItems.map((item) => {
          const isActive = activeTab
            ? item.path === `/${activeTab}`
            : pathname === item.path || (item.path !== "/catalogue" && pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 transition-all select-none ${
                isActive ? "text-emerald-800 font-bold scale-[1.02]" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px] text-emerald-700" : "stroke-2"}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight mt-0.5 font-medium whitespace-nowrap max-w-full px-1 text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
