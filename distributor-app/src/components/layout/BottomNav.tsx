"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, MessageSquare, ShoppingCart, Receipt } from "lucide-react";

interface BottomNavProps {
  cartItemCount?: number;
  lang?: "en" | "hi";
}

export function BottomNav({ cartItemCount = 0, lang = "en" }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      labelEn: "Catalogue",
      labelHi: "कैटलॉग",
      path: "/catalogue",
      icon: Store,
    },
    {
      labelEn: "Quick Order",
      labelHi: "मैसेज आर्डर",
      path: "/quick-order",
      icon: MessageSquare,
    },
    {
      labelEn: "My Cart",
      labelHi: "कार्ट",
      path: "/cart",
      icon: ShoppingCart,
      badge: cartItemCount,
    },
    {
      labelEn: "Orders",
      labelHi: "इतिहास",
      path: "/orders",
      icon: Receipt,
    },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-md pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path !== "/catalogue" && pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 min-h-[48px] flex flex-col items-center justify-center py-1 transition-colors select-none ${
                isActive ? "text-emerald-800 font-bold" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-2"}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight mt-0.5 font-medium">
                {lang === "hi" ? item.labelHi : item.labelEn}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
