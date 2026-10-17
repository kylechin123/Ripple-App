"use client";

// Loaded only in the browser (via next/dynamic with ssr: false): Leaflet needs `window`.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

export type MapIssue = {
  id: string;
  slug: string;
  title: string;
  category: string;
  ward: number | null;
  lat: number;
  lng: number;
  summary: string;
  helpers: number;
  status: "open" | "active" | "helped";
  questId: string | null;
};

const EMOJI: Record<string, string> = { environment: "🌿", food: "🥫", newcomers: "🤝", accessibility: "♿" };
const RING: Record<MapIssue["status"], string> = { open: "#7c3aed", active: "#f97316", helped: "#16a34a" };

function pin(issue: MapIssue, selected: boolean) {
  const size = selected ? 52 : 42;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:linear-gradient(135deg,#7c3aed,#db2777 55%,#f97316);border:3px solid ${RING[issue.status]};box-shadow:0 6px 16px -4px rgba(91,33,182,.6);display:grid;place-items:center">
      <span style="transform:rotate(45deg);font-size:${selected ? 24 : 19}px">${EMOJI[issue.category] ?? "📍"}</span></div>`,
  });
}

function FitBounds({ issues, me }: { issues: MapIssue[]; me: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = issues.map((i) => [i.lat, i.lng]);
    if (me) pts.push([me.lat, me.lng]);
    if (pts.length) map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 14 });
  }, [issues, me, map]);
  return null;
}

export default function IssueMap({
  issues,
  me,
  selectedId,
  onSelect,
}: {
  issues: MapIssue[];
  me: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer center={[43.8561, -79.337]} zoom={12} scrollWheelZoom className="h-full w-full" attributionControl>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <FitBounds issues={issues} me={me} />
      {me && <CircleMarker center={[me.lat, me.lng]} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }} />}
      {issues.map((i) => (
        <Marker key={i.id} position={[i.lat, i.lng]} icon={pin(i, i.id === selectedId)} eventHandlers={{ click: () => onSelect(i.id) }} title={i.title} />
      ))}
    </MapContainer>
  );
}
