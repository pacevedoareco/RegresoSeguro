"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Vehicle } from "@/types/database";
import { VehicleSelector } from "@/components/VehicleSelector";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await fetch("/api/vehicles");
        const data = await res.json();
        if (res.ok) {
          setVehicles(data.vehicles || []);
        }
      } catch (err) {
        console.error("Failed to load vehicles", err);
      } finally {
        setLoading(false);
      }
    }
    loadVehicles();
  }, []);

  const handleVehicleAdded = (newVehicle: Vehicle) => {
    setVehicles((prev) => [newVehicle, ...prev]);
  };

  const handleVehicleDeleted = (deletedId: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== deletedId));
    if (selectedId === deletedId) {
      setSelectedId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Mis Vehículos</h1>
          <p className="text-sm text-gray-600">
            Administrá los autos que usás para solicitar el servicio de conductor designado.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            Cargando vehículos...
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
            <VehicleSelector
              vehicles={vehicles}
              selectedVehicleId={selectedId}
              onSelect={setSelectedId}
              onVehicleAdded={handleVehicleAdded}
              onVehicleDeleted={handleVehicleDeleted}
            />
          </div>
        )}
      </div>
    </div>
  );
}
