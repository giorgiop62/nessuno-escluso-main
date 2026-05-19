import { createFileRoute } from "@tanstack/react-router";
import { categoryColorStyle, categoryMeta, rotationFor } from "@/lib/events-data";
import { BottomNav } from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { fetchPosts, postToEvent } from "@/lib/posts";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CircleMarker, Map as LeafletMap, Marker } from "leaflet";
import { categoryLabelKey, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/map")({
  component: MapPage,
});

type LocalPostEvent = ReturnType<typeof postToEvent>;

function MapPage() {
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const userMarkerRef = useRef<CircleMarker | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const { t } = useI18n();
  const { data: posts = [] } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });
  const events = useMemo(() => posts.map(postToEvent), [posts]);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    let cancelled = false;

    void Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")])
      .then(([leaflet]) => {
        if (cancelled || !mapEl.current) return;
        const L = leaflet.default;
        const map = L.map(mapEl.current, {
          center: [45.4642, 9.19],
          zoom: 12,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        leafletRef.current = leaflet;
        mapRef.current = map;
        setMapReady(true);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const center: [number, number] = [
                position.coords.latitude,
                position.coords.longitude,
              ];
              map.setView(center, 14);
              userMarkerRef.current = L.circleMarker(center, {
                radius: 8,
                fillColor: "#8c3f2f",
                fillOpacity: 1,
                color: "#ffffff",
                weight: 3,
              })
                .bindTooltip(t("yourPosition"))
                .addTo(map);
            },
            () => undefined,
            { enableHighAccuracy: true, timeout: 10000 },
          );
        }
      })
      .catch((error) => {
        if (!cancelled) setMapError(error instanceof Error ? error.message : t("mapUnavailable"));
      });

    return () => {
      cancelled = true;
      userMarkerRef.current?.remove();
      markerRefs.current.forEach((marker) => marker.remove());
      mapRef.current?.remove();
      leafletRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, [t]);

  useEffect(() => {
    const L = leafletRef.current?.default;
    const map = mapRef.current;
    if (!mapReady || !map || !L) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = events
      .filter((event) => typeof event.latitude === "number" && typeof event.longitude === "number")
      .map((event) => {
        const marker = L.marker([event.latitude!, event.longitude!], {
          icon: L.divIcon({
            html: createPostItMarkerHtml(event, t(categoryLabelKey(event.category))),
            className: "nessuno-postit-marker",
            iconSize: [120, 80],
            iconAnchor: [60, 72],
          }),
          keyboard: true,
          title: event.title,
        }).addTo(map);
        return marker;
      });
  }, [events, mapReady, t]);

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-3">
        <h1 className="font-hand text-4xl">{t("mapTitle")}</h1>
        <p className="font-hand-clean text-sm text-muted-foreground">{t("mapSubtitle")}</p>
      </header>

      <div className="mx-3 relative h-[70vh] rounded-2xl overflow-hidden border border-border/50 postit-shadow">
        <div ref={mapEl} className="absolute inset-0" />
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-card paper-texture px-6 text-center">
            <p className="font-hand-clean text-sm text-muted-foreground">{mapError}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function createPostItMarkerHtml(event: LocalPostEvent, categoryLabel: string) {
  const meta = categoryMeta[event.category];
  const rot = rotationFor(event.id);
  const { backgroundColor } = categoryColorStyle(event.category);

  return `
    <a
      href="/event/${event.id}"
      class="paper-texture postit-shadow rounded-[2px] px-2 py-1.5 block max-w-[120px] transition-transform hover:-translate-y-1"
      style="background-color: ${backgroundColor}; transform: rotate(${rot}deg);"
    >
      <div class="font-hand-clean text-[10px] opacity-70">${meta.icon} ${escapeHtml(categoryLabel)}</div>
      <div class="font-hand text-base leading-tight line-clamp-2">${escapeHtml(event.title)}</div>
    </a>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
