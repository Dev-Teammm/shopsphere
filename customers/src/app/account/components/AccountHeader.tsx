"use client";

import { FC } from "react";

import { LayoutDashboard, UserCircle, BellRing } from "lucide-react";

interface AccountHeaderProps {
  title: string;
  subtitle: string;
}

const AccountHeader: FC<AccountHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-green-50">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-[0.2em] mb-2">
          <UserCircle className="h-4 w-4" />
          Customer Portal
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
          {title}
        </h1>
        <p className="text-gray-500 font-medium">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
          <BellRing className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
        </div>
        <div className="px-5 py-3 bg-green-600 text-white rounded-2xl shadow-lg shadow-green-100 font-bold text-sm flex items-center gap-2 hover:bg-green-700 transition-colors cursor-pointer">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </div>
      </div>
    </div>
  );
};

export default AccountHeader;
