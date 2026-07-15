import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "../styles/global.css";
import { Episode02 } from "./Episode02.tsx";

const container = document.getElementById("root")!;
const app = (
  <StrictMode>
    <Episode02 />
  </StrictMode>
);

// Production HTML is prerendered (scripts/prerender.ts) → hydrate.
// Dev serves an empty #root → render.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
