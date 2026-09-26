"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Top Navigation */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <span className="font-black tracking-tight text-base block">
                Regreso<span className="text-blue-400">Seguro</span>{" "}
                <span className="text-[10px] uppercase font-bold bg-blue-600/60 px-2 py-0.5 rounded-full ml-1 border border-blue-400/30">
                  Panel Operador
                </span>
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs font-semibold">
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg transition ${
                pathname === "/admin"
                  ? "bg-slate-800 text-white font-bold"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              📋 Solicitudes
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200 transition"
            >
              App Pasajero
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
