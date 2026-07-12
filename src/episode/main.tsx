import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles/global.css";
import { Episode } from "./Episode.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Episode />
  </StrictMode>,
);
