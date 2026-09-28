"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Vehicle } from "@/types/database";
import type { PriceBreakdown } from "@/lib/pricing/pricing";
import { formatPrice } from "@/lib/pricing/pricing";
import { VehicleSelector } from "./VehicleSelector";

// Dynamically import MapView to avoid Leaflet SSR window errors
const MapView = dynamic(() => import("./MapView"), { ssr: false });

interface LocationState {
  address: string;
  lat: number;
  lng: number;
}

const PENDING_REQUEST_KEY = "regreso_pending_service_request";

export function ServiceRequestWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Pickup, 2: Destination, 3: Vehicle, 4: Review

  const [pickup, setPickup] = useState<LocationState | null>(null);
  const [destination, setDestination] = useState<LocationState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const [estimate, setEstimate] = useState<PriceBreakdown | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [noDriversAvailable, setNoDriversAvailable] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Check for restored pending request after login/registration (FR-003)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(PENDING_REQUEST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pickup && parsed.destination && parsed.vehicle) {
          setPickup(parsed.pickup);
          setDestination(parsed.destination);
          
          const vehicleData = parsed.vehicle;
          // Check if vehicle was temporary
          if (vehicleData.id?.startsWith("temp-")) {
            // Attempt to persist vehicle to user account if now logged in
            fetch("/api/vehicles", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                license_plate: vehicleData.license_plate,
                make_model: vehicleData.make_model,
                color: vehicleData.color,
              }),
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                const savedVehicle: Vehicle = data?.vehicle || vehicleData;
                setVehicles([savedVehicle]);
                setSelectedVehicleId(savedVehicle.id);
                setStep(4);
              })
              .catch(() => {
                setVehicles([vehicleData]);
                setSelectedVehicleId(vehicleData.id);
                setStep(4);
              });
          } else {
            setVehicles([vehicleData]);
            setSelectedVehicleId(vehicleData.id);
            setStep(4);
          }
          // Clear pending request from session storage
          sessionStorage.removeItem(PENDING_REQUEST_KEY);
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, []);

  // Load vehicles when entering step 3
  useEffect(() => {
    if (step === 3 && vehicles.length === 0) {
      setLoadingVehicles(true);
      fetch("/api/vehicles")
        .then((res) => {
          if (res.status === 401) {
            // Unauthenticated guest user
            return { vehicles: [] };
          }
          return res.json();
        })
        .then((data) => {
          const list: Vehicle[] = data.vehicles || [];
          setVehicles(list);
          if (list.length > 0 && !selectedVehicleId) {
            setSelectedVehicleId(list[0].id);
          }
        })
        .catch(() => {
          setVehicles([]);
        })
        .finally(() => setLoadingVehicles(false));
    }
  }, [step, vehicles.length, selectedVehicleId]);

  // Trigger price estimation when reaching step 4
  useEffect(() => {
    if (step === 4 && pickup && destination) {
      setLoadingEstimate(true);
      setNoDriversAvailable(false);
      setSubmitError(null);

      fetch("/api/services/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
        }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.status === 503 || data.code === "NO_DRIVERS_AVAILABLE") {
            setNoDriversAvailable(true);
            return;
          }
          if (!res.ok) {
            setSubmitError(data.message || "Error al calcular el costo.");
            return;
          }
          setEstimate(data.estimate);
        })
        .catch(() => {
          setSubmitError("No se pudo conectar con el servicio de estimación.");
        })
        .finally(() => setLoadingEstimate(false));
    }
  }, [step, pickup, destination]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Geocoding search handler
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: { label: string; lat: number; lng: number }) => {
    const loc = { address: res.label, lat: res.lat, lng: res.lng };
    if (step === 1) {
      setPickup(loc);
    } else if (step === 2) {
      setDestination(loc);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      const loc = { address: data.address || `Punto en mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng };
      if (step === 1) {
        setPickup(loc);
      } else if (step === 2) {
        setDestination(loc);
      }
    } catch {
      const loc = { address: `Punto en mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng };
      if (step === 1) {
        setPickup(loc);
      } else if (step === 2) {
        setDestination(loc);
      }
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await handleMapClick(latitude, longitude);
      },
      (err) => {
        alert("No se pudo obtener tu ubicación actual: " + err.message);
      }
    );
  };

  const handleSubmitRequest = async () => {
    if (!pickup || !destination || !selectedVehicleId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const vehicleObj = vehicles.find((v) => v.id === selectedVehicleId);

    // If vehicle is temporary (guest mode), trigger lazy authentication gate (FR-003)
    if (selectedVehicleId.startsWith("temp-")) {
      try {
        sessionStorage.setItem(
          PENDING_REQUEST_KEY,
          JSON.stringify({
            pickup,
            destination,
            vehicle: vehicleObj,
          })
        );
      } catch {
        // Ignore storage errors
      }
      router.push("/auth/login?redirect=/");
      return;
    }

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: selectedVehicleId,
          pickup_address: pickup.address,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          destination_address: destination.address,
          destination_lat: destination.lat,
          destination_lng: destination.lng,
        }),
      });

      if (res.status === 401) {
        // User session expired or unauthenticated — trigger FR-003 lazy auth gate
        try {
          sessionStorage.setItem(
            PENDING_REQUEST_KEY,
            JSON.stringify({
              pickup,
              destination,
              vehicle: vehicleObj,
            })
          );
        } catch {
          // Ignore storage errors
        }
        router.push("/auth/login?redirect=/");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || "Error al solicitar el servicio.");
        setIsSubmitting(false);
        return;
      }

      // Successfully created service! Redirect to status or reload
      router.push(`/?service_id=${data.service.id}`);
    } catch {
      setSubmitError("Error de conexión. Intentá nuevamente.");
      setIsSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 max-w-lg mx-auto">
      {/* Wizard Step Indicator */}
      <div className="px-6 pt-5 pb-3 bg-gray-50/80 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-blue-600 text-white ring-4 ring-blue-100"
                    : step > s
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s ? "✓" : s}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-gray-500">
            {step === 1 && "Paso 1: Punto de partida"}
            {step === 2 && "Paso 2: Destino"}
            {step === 3 && "Paso 3: Vehículo"}
            {step === 4 && "Paso 4: Confirmación"}
          </span>
        </div>
      </div>

      {/* Step 1: Pickup Location */}
      {step === 1 && (
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">¿Dónde estás ahora?</h2>
            <p className="text-sm text-gray-600">
              Marcá en el mapa o escribí la dirección donde dejaste el auto.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar calle y altura..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
              {isSearching && (
                <div className="absolute right-3 top-3 text-xs text-gray-400">
                  Buscando...
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectSearchResult(r)}
                      className="p-3 text-xs text-gray-800 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={useCurrentLocation}
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition"
              title="Usar mi GPS"
            >
              📍 Mi GPS
            </button>
          </div>

          <div className="h-56 relative rounded-2xl overflow-hidden border border-gray-200">
            <MapView
              pickup={pickup ? { lat: pickup.lat, lng: pickup.lng } : null}
              onMapClick={handleMapClick}
            />
          </div>

          {pickup && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <span className="font-bold">📍 Origen:</span>
              <span className="flex-1">{pickup.address}</span>
            </div>
          )}

          <button
            type="button"
            disabled={!pickup}
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition shadow-sm"
          >
            Continuar a Destino →
          </button>
        </div>
      )}

      {/* Step 2: Destination Location */}
      {step === 2 && (
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">¿Hacia dónde vas?</h2>
            <p className="text-sm text-gray-600">
              Indicá el lugar al que el conductor designado debe llevarte a vos y a tu auto.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar dirección de destino..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
              {isSearching && (
                <div className="absolute right-3 top-3 text-xs text-gray-400">
                  Buscando...
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectSearchResult(r)}
                      className="p-3 text-xs text-gray-800 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-56 relative rounded-2xl overflow-hidden border border-gray-200">
            <MapView
              pickup={pickup ? { lat: pickup.lat, lng: pickup.lng } : null}
              destination={destination ? { lat: destination.lat, lng: destination.lng } : null}
              onMapClick={handleMapClick}
            />
          </div>

          {destination && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
              <span className="font-bold">🏁 Destino:</span>
              <span className="flex-1">{destination.address}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              ← Volver
            </button>
            <button
              type="button"
              disabled={!destination}
              onClick={() => setStep(3)}
              className="flex-2 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition shadow-sm"
            >
              Seleccionar auto →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Vehicle Selection */}
      {step === 3 && (
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">¿Qué auto vas a manejar?</h2>
            <p className="text-sm text-gray-600">
              Seleccioná el auto registrado que conducirá el chofer designado.
            </p>
          </div>

          {loadingVehicles ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Cargando tus vehículos...
            </div>
          ) : (
            <VehicleSelector
              vehicles={vehicles}
              selectedVehicleId={selectedVehicleId}
              onSelect={setSelectedVehicleId}
              onVehicleAdded={(v) => {
                setVehicles((prev) => [v, ...prev]);
                setSelectedVehicleId(v.id);
              }}
              onVehicleDeleted={(id) => {
                setVehicles((prev) => prev.filter((v) => v.id !== id));
                if (selectedVehicleId === id) setSelectedVehicleId(null);
              }}
            />
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              ← Volver
            </button>
            <button
              type="button"
              disabled={!selectedVehicleId}
              onClick={() => setStep(4)}
              className="flex-2 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition shadow-sm"
            >
              Ver presupuesto →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Price Estimation */}
      {step === 4 && (
        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Resumen del servicio</h2>
            <p className="text-sm text-gray-600">
              Revisá los datos antes de solicitar el chofer.
            </p>
          </div>

          {/* Route details */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex items-start gap-2 text-xs">
              <span className="font-bold text-blue-600 min-w-16">ORIGEN:</span>
              <span className="text-gray-800">{pickup?.address}</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="font-bold text-emerald-600 min-w-16">DESTINO:</span>
              <span className="text-gray-800">{destination?.address}</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="font-bold text-gray-600 min-w-16">VEHÍCULO:</span>
              <span className="text-gray-800 font-semibold">
                {selectedVehicle?.make_model} ({selectedVehicle?.license_plate}) - {selectedVehicle?.color}
              </span>
            </div>
          </div>

          {/* Price breakdown according to BR-012 */}
          {loadingEstimate ? (
            <div className="py-6 text-center text-sm text-gray-500 animate-pulse">
              Calculando ruta de 3 tramos y tarifa estimada...
            </div>
          ) : noDriversAvailable ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-sm space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                ⚠️ Sin conductores disponibles
              </p>
              <p className="text-xs text-amber-800">
                No hay conductores disponibles en este momento. Intentá de nuevo más tarde.
              </p>
            </div>
          ) : estimate ? (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Desglose de distancia y costo (3 tramos)
              </h4>
              <div className="space-y-1.5 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>1. Chofer → Punto de partida:</span>
                  <span className="font-medium">{Math.round(estimate.pickupKm)} km</span>
                </div>
                <div className="flex justify-between">
                  <span>2. Punto de partida → Destino:</span>
                  <span className="font-medium">{Math.round(estimate.rideKm)} km</span>
                </div>
                <div className="flex justify-between">
                  <span>3. Retorno del chofer:</span>
                  <span className="font-medium">{Math.round(estimate.returnKm)} km</span>
                </div>
                <div className="pt-2 border-t border-blue-200/60 flex justify-between font-semibold text-gray-900">
                  <span>Distancia total facturable:</span>
                  <span>{Math.round(estimate.totalKm)} km</span>
                </div>
              </div>

              <div className="pt-3 border-t border-blue-200 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-gray-500 block">Tarifa estimada</span>
                  <span className="text-2xl font-black text-blue-900">
                    {formatPrice(estimate.totalPrice)}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">
                  ({formatPrice(estimate.pricePerKm)} / km)
                </span>
              </div>
            </div>
          ) : null}

          {submitError && (
            <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {submitError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              ← Volver
            </button>
            <button
              type="button"
              disabled={noDriversAvailable || loadingEstimate || !estimate || isSubmitting}
              onClick={handleSubmitRequest}
              className="flex-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition shadow-md"
            >
              {isSubmitting ? "Solicitando..." : "Confirmar y Solicitar Chofer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
