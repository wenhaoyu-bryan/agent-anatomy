import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "../styles/global.css";
import { Episode15 } from "./Episode15.tsx";

const container = document.getElementById("root")!;
const app = (
  <StrictMode>
    <Episode15 />
  </StrictMode>
);

// Production HTML is prerendered (scripts/prerender.ts) → hydrate.
// Dev serves an empty #root → render.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
