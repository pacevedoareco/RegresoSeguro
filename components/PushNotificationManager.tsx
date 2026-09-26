"use client";

import { useState, useEffect } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const BANNER_STORAGE_KEY = "regreso_push_banner_dismissed";

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(true); // default true until checked

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
      const currentPerm = Notification.permission;
      setPermission(currentPerm);

      const isDismissed = localStorage.getItem(BANNER_STORAGE_KEY) === "true";
      setBannerDismissed(isDismissed);

      // Check existing subscription
      void navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          setIsSubscribed(true);
        }
      });
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_STORAGE_KEY, "true");
    } catch {
      // Ignore localStorage errors
    }
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined");
        setLoading(false);
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      // Once permission is granted, dismiss the prompt
      dismissBanner();

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // Send subscription to server (if user is authenticated, it will save)
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (res.ok) {
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("Error subscribing to push:", err);
    } finally {
      setLoading(false);
    }
  };

  // Do not render anything if push is not supported, or permission already granted/denied, or already subscribed, or dismissed
  if (!isSupported || isSubscribed || permission === "granted" || permission === "denied" || bannerDismissed) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl" role="img" aria-label="Campana">
            🔔
          </span>
          <div>
            <h4 className="text-sm font-semibold text-blue-900">
              Activá las notificaciones de tu viaje
            </h4>
            <p className="text-xs text-blue-700 mt-0.5">
              Recibí avisos en tiempo real cuando tu conductor sea asignado o esté llegando, incluso con la pantalla apagada.
            </p>
          </div>
        </div>
        <button
          onClick={dismissBanner}
          className="text-gray-400 hover:text-gray-600 text-sm ml-2"
          aria-label="Cerrar aviso"
        >
          ✕
        </button>
      </div>
      <div className="mt-3 flex justify-end space-x-2">
        <button
          onClick={dismissBanner}
          className="px-3 py-1.5 text-xs text-gray-600 hover:bg-blue-100 rounded-md font-medium"
        >
          Ahora no
        </button>
        <button
          onClick={subscribeToPush}
          disabled={loading}
          className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition disabled:opacity-50"
        >
          {loading ? "Activando..." : "Activar notificaciones"}
        </button>
      </div>
    </div>
  );
}
