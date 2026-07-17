import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { Landing } from "../landing/Landing";
import { Episode } from "../episode/Episode";
import { Episode15 } from "../episode15/Episode15";
import { Episode02 } from "../episode02/Episode02";
import { Episode03 } from "../episode03/Episode03";

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

export function renderEpisode15(): string {
  return renderToString(
    <StrictMode>
      <Episode15 />
    </StrictMode>,
  );
}

export function renderEpisode02(): string {
  return renderToString(
    <StrictMode>
      <Episode02 />
    </StrictMode>,
  );
}

export function renderEpisode03(): string {
  return renderToString(
    <StrictMode>
      <Episode03 />
    </StrictMode>,
  );
}
