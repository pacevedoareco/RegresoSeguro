"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  strikes: number;
  is_suspended: boolean;
  average_rating: number | null;
  rating_count: number;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }
      setEmail(user.email ?? null);

      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">
        Cargando perfil...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            ← Inicio
          </Link>
          <h1 className="font-extrabold text-gray-900 text-base">Mi Perfil</h1>
          <button
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* User Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs text-center space-y-3">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            {profile?.full_name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="font-black text-lg text-gray-900">
              {profile?.full_name || "Usuario"}
            </h2>
            <p className="text-xs text-gray-500">{email}</p>
            {profile?.phone && (
              <p className="text-xs text-gray-400 mt-0.5">{profile.phone}</p>
            )}
          </div>

          <div className="pt-3 flex justify-center gap-6 border-t border-gray-100">
            <div>
              <div className="text-base font-extrabold text-amber-500 flex items-center justify-center gap-1">
                <span>★</span>
                <span>
                  {profile?.average_rating
                    ? Number(profile.average_rating).toFixed(1)
                    : "5.0"}
                </span>
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">
                Calificación
              </div>
            </div>

            <div>
              <div
                className={`text-base font-extrabold ${
                  (profile?.strikes ?? 0) > 0 ? "text-rose-600" : "text-gray-900"
                }`}
              >
                {profile?.strikes ?? 0}/3
              </div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">
                Strikes
              </div>
            </div>
          </div>
        </div>

        {/* Suspension Banner */}
        {profile?.is_suspended && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-700 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <span>🚫</span> Cuenta Suspendida
            </div>
            <p>
              Tu cuenta ha sido suspendida debido a 3 cancelaciones posteriores a la asignación de conductor. Contactá a soporte para más información.
            </p>
          </div>
        )}

        {/* Navigation Links */}
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-xs">
          <Link
            href="/profile/trips"
            className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📜</span>
              <div>
                <div className="text-xs font-bold text-gray-900">
                  Historial de Viajes
                </div>
                <div className="text-[11px] text-gray-500">
                  Revisá tus viajes anteriores y calificaciones
                </div>
              </div>
            </div>
            <span className="text-gray-400 font-bold text-xs">→</span>
          </Link>

          <Link
            href="/vehicles"
            className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🚘</span>
              <div>
                <div className="text-xs font-bold text-gray-900">
                  Mis Autos Guardados
                </div>
                <div className="text-[11px] text-gray-500">
                  Gestioná tus vehículos registrados
                </div>
              </div>
            </div>
            <span className="text-gray-400 font-bold text-xs">→</span>
          </Link>

          {profile?.role === "driver" && (
            <Link
              href="/driver"
              className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🚕</span>
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    Panel de Conductor
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Accedé a tus viajes asignados
                  </div>
                </div>
              </div>
              <span className="text-gray-400 font-bold text-xs">→</span>
            </Link>
          )}

          {(profile?.role === "operator" || profile?.role === "super_admin") && (
            <Link
              href="/admin"
              className="p-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🛡️</span>
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    Panel de Administración
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Operación y control del servicio
                  </div>
                </div>
              </div>
              <span className="text-gray-400 font-bold text-xs">→</span>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
