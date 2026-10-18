"use client";

import React from "react";
import {
  Home,
  TrendingUp,
  Infinity,
  Briefcase,
  Users,
  Compass,
  Activity,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

export const LeftNavigationRail: React.FC = () => {
  const [activeItem, setActiveItem] = React.useState<string>("Spot");

  const navItems = [
    { id: "Home", label: "Home", icon: Home },
    { id: "Spot", label: "Spot", icon: TrendingUp },
    { id: "Perpetual", label: "Perpetual", icon: Infinity },
    { id: "Portfolio", label: "Portfolio", icon: Briefcase },
    { id: "Referrals", label: "Referrals", icon: Users },
    { id: "Explore", label: "Explore", icon: Compass },
    { id: "Activity", label: "Activity", icon: Activity },
  ];

  return (
    <aside className="w-16 bg-white border-r border-slate-200 flex flex-col justify-between py-4 items-center shrink-0 min-h-screen select-none">
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand Logo at Top */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-sm">
          <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
            <span className="text-blue-600 font-extrabold text-base tracking-tighter">zk</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                className={`w-full py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-bold shadow-xs"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : ""}`} />
                <span className="text-[9px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Help Icon */}
      <div className="flex flex-col items-center gap-3">
        <a
          href="https://github.com/Ajaykrishnanand/p2p-zkarkiv/blob/main/HOW_TO_USE.md"
          target="_blank"
          rel="noreferrer"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          title="Arkiv DB-Chain Help & Public How-To-Use Guide"
        >
          <HelpCircle className="w-5 h-5" />
        </a>
      </div>
    </aside>
  );
};
