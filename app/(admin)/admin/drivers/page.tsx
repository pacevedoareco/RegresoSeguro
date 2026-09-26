"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DriverWithProfile {
  id: string;
  dni: string;
  license_number: string;
  license_category: string;
  availability: string;
  is_active: boolean;
  profile?: {
    id: string;
    full_name: string;
    phone: string | null;
    average_rating: number | null;
    rating_count: number;
    is_suspended: boolean;
  };
}

interface PendingApplicant {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
}

export default function DriversAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverWithProfile[]>([]);
  const [pendingApplicants, setPendingApplicants] = useState<PendingApplicant[]>([]);

  // Modal / Form state for promoting
  const [selectedApplicant, setSelectedApplicant] = useState<PendingApplicant | null>(null);
  const [promoteForm, setPromoteForm] = useState({
    dni: "",
    license_number: "",
    license_category: "B1",
    phone: "",
  });
  const [promoting, setPromoting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Driver Modal state
  const [editingDriver, setEditingDriver] = useState<DriverWithProfile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    dni: "",
    license_number: "",
    license_category: "B1",
  });
  const [updating, setUpdating] = useState(false);

  const fetchDriversData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/drivers");
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
        setPendingApplicants(data.pendingApplications || []);
      }
    } catch (err) {
      console.error("Error loading drivers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || (profile.role !== "operator" && profile.role !== "super_admin")) {
        router.push("/");
        return;
      }

      setUserRole(profile.role);
      fetchDriversData();
    };

    checkRole();
  }, [router, fetchDriversData]);

  const handleOpenPromote = (applicant: PendingApplicant) => {
    setSelectedApplicant(applicant);
    setPromoteForm({
      dni: "",
      license_number: "",
      license_category: "B1",
      phone: applicant.phone || "",
    });
    setErrorMsg(null);
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;

    setPromoting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedApplicant.id,
          dni: promoteForm.dni,
          license_number: promoteForm.license_number,
          license_category: promoteForm.license_category,
          phone: promoteForm.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Error al promover usuario a conductor.");
      } else {
        setSelectedApplicant(null);
        fetchDriversData();
      }
    } catch {
      setErrorMsg("Error de conexión al dar de alta al conductor.");
    } finally {
      setPromoting(false);
    }
  };

  const handleToggleActive = async (driver: DriverWithProfile) => {
    const newStatus = !driver.is_active;
    const confirmText = newStatus
      ? `¿Reactivar al conductor ${driver.profile?.full_name}?`
      : `¿Desactivar al conductor ${driver.profile?.full_name}? No podrá recibir viajes.`;

    if (!confirm(confirmText)) return;

    try {
      const res = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: driver.id,
          is_active: newStatus,
        }),
      });

      if (res.ok) {
        fetchDriversData();
      } else {
        const data = await res.json();
        alert(data.message || "Error al actualizar estado.");
      }
    } catch {
      alert("Error de conexión al actualizar estado del conductor.");
    }
  };

  const handleOpenEdit = (driver: DriverWithProfile) => {
    setEditingDriver(driver);
    setEditForm({
      full_name: driver.profile?.full_name || "",
      phone: driver.profile?.phone || "",
      dni: driver.dni || "",
      license_number: driver.license_number || "",
      license_category: driver.license_category || "B1",
    });
    setErrorMsg(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    setUpdating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driver_id: editingDriver.id,
          full_name: editForm.full_name,
          phone: editForm.phone,
          dni: editForm.dni,
          license_number: editForm.license_number,
          license_category: editForm.license_category,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Error al actualizar conductor.");
      } else {
        setEditingDriver(null);
        fetchDriversData();
      }
    } catch {
      setErrorMsg("Error de conexión al actualizar datos.");
    } finally {
      setUpdating(false);
    }
  };

  const isSuperAdmin = userRole === "super_admin";

  if (loading) {
    return (
      <div className="text-center py-24 text-gray-500 font-medium">
        Cargando gestión de conductores...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Gestión de Conductores
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Supervisá el estado del equipo, altas de nuevos choferes y documentación habilitante.
        </p>
      </div>

      {/* 1. Solicitudes de Alta Pendientes (PD-022 / OQ-003 / AC-023-4) */}
      <section className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
        <div className="p-5 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-amber-950 flex items-center gap-2">
              <span>⏳</span> Postulaciones de Conductores Pendientes
            </h2>
            <p className="text-xs text-amber-700 mt-0.5">
              Usuarios registrados desde la página de conductores que aguardan validación y promoción.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-amber-200 text-amber-900 rounded-full">
            {pendingApplicants.length} pendientes
          </span>
        </div>

        {pendingApplicants.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No hay postulaciones de conductores pendientes de revisión.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4">Fecha Postulación</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-amber-50/30">
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {app.full_name}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {app.phone || <span className="text-gray-400 italic">No informado</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {new Date(app.created_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isSuperAdmin ? (
                        <button
                          onClick={() => handleOpenPromote(app)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                        >
                          Validar & Dar de Alta
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Requiere Super-Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Lista de Conductores Registrados */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🚗</span> Plantel de Conductores Activos
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Estado de conexión, calificación promedio y datos de licencia.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full">
            {drivers.length} choferes
          </span>
        </div>

        {drivers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No hay conductores dados de alta en el sistema.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Conductor</th>
                  <th className="py-3 px-4">DNI / Licencia</th>
                  <th className="py-3 px-4">Disponibilidad</th>
                  <th className="py-3 px-4">Calificación</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        {driver.profile?.full_name || "Sin nombre"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {driver.profile?.phone || "Sin teléfono"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-gray-800 font-mono font-medium">
                        DNI: {driver.dni}
                      </div>
                      <div className="text-xs text-gray-500">
                        Lic: {driver.license_number} ({driver.license_category})
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          driver.availability === "online"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            driver.availability === "online" ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                        {driver.availability === "online" ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <span>★</span>
                        <span>
                          {driver.profile?.average_rating
                            ? Number(driver.profile.average_rating).toFixed(1)
                            : "5.0"}
                        </span>
                        <span className="text-gray-400 font-normal">
                          ({driver.profile?.rating_count || 0})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {driver.is_active ? (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-700 rounded-md">
                          Desactivado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {isSuperAdmin ? (
                        <>
                          <button
                            onClick={() => handleOpenEdit(driver)}
                            className="text-xs text-gray-600 hover:text-blue-600 font-medium px-2 py-1 rounded hover:bg-gray-100 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleToggleActive(driver)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded transition ${
                              driver.is_active
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {driver.is_active ? "Desactivar" : "Reactivar"}
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal: Promover Postulante a Conductor */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">
                Promover a Conductor
              </h3>
              <button
                onClick={() => setSelectedApplicant(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Completá los datos legales de <strong>{selectedApplicant.full_name}</strong> para habilitar su acceso como chofer.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handlePromoteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  required
                  value={promoteForm.phone}
                  onChange={(e) =>
                    setPromoteForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  placeholder="ej. +54 9 11 1234-5678"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  DNI (Documento Nacional de Identidad)
                </label>
                <input
                  type="text"
                  required
                  value={promoteForm.dni}
                  onChange={(e) =>
                    setPromoteForm((prev) => ({ ...prev, dni: e.target.value }))
                  }
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  placeholder="ej. 38123456"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    N° de Licencia
                  </label>
                  <input
                    type="text"
                    required
                    value={promoteForm.license_number}
                    onChange={(e) =>
                      setPromoteForm((prev) => ({
                        ...prev,
                        license_number: e.target.value,
                      }))
                    }
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                    placeholder="ej. 38123456"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={promoteForm.license_category}
                    onChange={(e) =>
                      setPromoteForm((prev) => ({
                        ...prev,
                        license_category: e.target.value,
                      }))
                    }
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="B1">B1 (Particular)</option>
                    <option value="B2">B2 (Particular c/acoplado)</option>
                    <option value="D1">D1 (Profesional Transporte)</option>
                    <option value="D2">D2 (Profesional Pasajeros)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedApplicant(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={promoting}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {promoting ? "Guardando..." : "Confirmar Alta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Conductor */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">
                Editar Datos del Conductor
              </h3>
              <button
                onClick={() => setEditingDriver(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  DNI
                </label>
                <input
                  type="text"
                  required
                  value={editForm.dni}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, dni: e.target.value }))
                  }
                  className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    N° Licencia
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.license_number}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        license_number: e.target.value,
                      }))
                    }
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={editForm.license_category}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        license_category: e.target.value,
                      }))
                    }
                    className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden bg-white"
                  >
                    <option value="B1">B1 (Particular)</option>
                    <option value="B2">B2 (Particular c/acoplado)</option>
                    <option value="D1">D1 (Profesional Transporte)</option>
                    <option value="D2">D2 (Profesional Pasajeros)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {updating ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
