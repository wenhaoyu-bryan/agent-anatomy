import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "../styles/global.css";
import { Episode03 } from "./Episode03.tsx";

const container = document.getElementById("root")!;
const app = (
  <StrictMode>
    <Episode03 />
  </StrictMode>
);

// Production HTML is prerendered (scripts/prerender.ts) → hydrate.
// Dev serves an empty #root → render.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
