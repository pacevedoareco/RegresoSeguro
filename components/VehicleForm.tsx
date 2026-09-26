"use client";

import { useState } from "react";
import type { Vehicle } from "@/types/database";

interface VehicleFormProps {
  onSuccess: (vehicle: Vehicle) => void;
  onCancel?: () => void;
}

export function VehicleForm({ onSuccess, onCancel }: VehicleFormProps) {
  const [licensePlate, setLicensePlate] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [color, setColor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const trimmedPlate = licensePlate.trim().toUpperCase();
    const trimmedMakeModel = makeModel.trim();
    const trimmedColor = color.trim();

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_plate: trimmedPlate,
          make_model: trimmedMakeModel,
          color: trimmedColor,
        }),
      });

      if (res.status === 401) {
        // Guest / Unauthenticated flow: Create local temporary vehicle
        const tempVehicle: Vehicle = {
          id: `temp-${Date.now()}`,
          rider_id: "guest",
          license_plate: trimmedPlate,
          make_model: trimmedMakeModel,
          color: trimmedColor,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        onSuccess(tempVehicle);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Error al registrar el vehículo.");
        return;
      }

      onSuccess(data.vehicle);
    } catch {
      // If network fails or offline, provide temporary vehicle for guest mode
      const tempVehicle: Vehicle = {
        id: `temp-${Date.now()}`,
        rider_id: "guest",
        license_plate: trimmedPlate,
        make_model: trimmedMakeModel,
        color: trimmedColor,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      onSuccess(tempVehicle);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
      <h3 className="font-semibold text-gray-900 text-base">Registrar nuevo vehículo</h3>

      {error && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-1">
          Patente / Dominio
        </label>
        <input
          id="licensePlate"
          type="text"
          required
          placeholder="Ej: AB123CD o AAA123"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase tracking-wider text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="makeModel" className="block text-sm font-medium text-gray-700 mb-1">
          Marca y Modelo
        </label>
        <input
          id="makeModel"
          type="text"
          required
          placeholder="Ej: Ford Fiesta, Volkswagen Gol"
          value={makeModel}
          onChange={(e) => setMakeModel(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
          Color
        </label>
        <input
          id="color"
          type="text"
          required
          placeholder="Ej: Gris plata, Azul oscuro"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          disabled={isLoading}
        />
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Guardando..." : "Guardar vehículo"}
        </button>
      </div>
    </form>
  );
}
