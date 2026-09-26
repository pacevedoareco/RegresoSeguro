"use client";

import { useState } from "react";
import type { Vehicle } from "@/types/database";
import { VehicleForm } from "./VehicleForm";

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  onVehicleAdded: (vehicle: Vehicle) => void;
  onVehicleDeleted?: (vehicleId: string) => void;
}

export function VehicleSelector({
  vehicles,
  selectedVehicleId,
  onSelect,
  onVehicleAdded,
  onVehicleDeleted,
}: VehicleSelectorProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreated = (vehicle: Vehicle) => {
    setShowAddForm(false);
    onVehicleAdded(vehicle);
    onSelect(vehicle.id);
  };

  const handleDelete = async (vehicleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que querés eliminar este vehículo?")) return;

    setDeletingId(vehicleId);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onVehicleDeleted?.(vehicleId);
      }
    } catch (err) {
      console.error("Error deleting vehicle:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-800">
          Seleccionar Vehículo
        </label>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            + Agregar vehículo
          </button>
        )}
      </div>

      {showAddForm ? (
        <VehicleForm
          onSuccess={handleCreated}
          onCancel={() => setShowAddForm(false)}
        />
      ) : vehicles.length === 0 ? (
        <div className="text-center py-6 px-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
          <p className="text-sm text-gray-500 mb-3">No tenés vehículos guardados todavía.</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Registrar mi primer auto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {vehicles.map((v) => {
            const isSelected = selectedVehicleId === v.id;
            return (
              <div
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-600/30"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm tracking-wide">
                        {v.license_plate}
                      </span>
                      <span className="text-xs text-gray-500">• {v.color}</span>
                    </div>
                    <p className="text-xs text-gray-600">{v.make_model}</p>
                  </div>
                </div>

                {onVehicleDeleted && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(v.id, e)}
                    disabled={deletingId === v.id}
                    className="text-gray-400 hover:text-red-600 p-1 rounded-md text-xs transition"
                    title="Eliminar vehículo"
                  >
                    {deletingId === v.id ? "..." : "✕"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
