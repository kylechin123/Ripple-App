import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ripple",
    short_name: "Ripple",
    description: "Personalized, verified local quests for Markham and York Region.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7ff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
