import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { Landing } from "../landing/Landing";
import { Episode } from "../episode/Episode";

/**
 * SSR entry for the build-time HTML snapshot (§8: view-source must show the
 * essay text). Built by vite.ssr.config.ts, consumed by scripts/prerender.ts.
 * No CSS imports here — styles ship via the client bundle.
 */
export function renderLanding(): string {
  return renderToString(
    <StrictMode>
      <Landing />
    </StrictMode>,
  );
}

export function renderEpisode(): string {
  return renderToString(
    <StrictMode>
      <Episode />
    </StrictMode>,
  );
}
