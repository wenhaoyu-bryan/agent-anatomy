# Launch kit — Episode 01

Ready-to-post material for launching Agent Anatomy. Attach the share clip
(record S3→S4 per the note at the bottom, or use `docs/media/replay.gif`)
to the first post — clip-first is the whole strategy.

## X thread (3 posts)

**Post 1 (with the clip):**

> Everyone says "AI agents are just a model in a loop."
>
> OK — but what does that actually look like?
>
> I built an interactive explainer where you watch an agent fix a broken web
> page, event by event, while its context window fills up in real time:
>
> https://wenhaoyu-bryan.github.io/agent-anatomy/episodes/how-an-agent-works/

**Post 2:**

> The part I'm proudest of: the replay isn't a video.
>
> It's a JSON "trace" file — same shape as a real agent transcript — played
> by an open-source engine. Scrub it, rewind it, autoplay it.
>
> Write your own trace and it just plays: https://github.com/wenhaoyu-bryan/agent-anatomy

**Post 3:**

> Built with Claude Code over one weekend: React Three Fiber for the token
> particles, GSAP for the scroll story, zod for the trace schema.
>
> Episode 1.5 — "Where agents go wrong" — is next. Follow along, or star the
> repo if you want to write traces for it.

## Show HN

**Title:**

> Show HN: An interactive explainer of how AI agents work, with a replayable trace format

**First comment (post immediately after submitting):**

> Hi HN — I made this because every explanation of "agents" I could send my
> non-engineer friends was either a hype thread or a framework README.
>
> The page teaches three things: the agent loop (think → act → observe →
> repeat), the context window as a finite budget that every tool result
> spends, and tool use — by letting you watch a scripted agent fix a broken
> product page while a WebGL "window" fills with token particles.
>
> The piece I'd most like feedback on is the trace format: a small JSON
> schema for agent runs (system prompt, thinking, tool calls/results with
> full artifact snapshots, token estimates per event) plus a headless
> replay engine that renders any conforming file. Snapshots instead of
> diffs keep scrubbing O(1). Docs: /docs/trace-format.md in the repo.
>
> Everything degrades without WebGL, the essay text is prerendered for
> view-source, and reduced-motion gets a static variant. Built with
> Claude Code; the build log is NOTES.md in the repo.

## Portfolio blurb (~200 words, for Featured Projects)

> **Agent Anatomy** — an interactive essay series that explains how AI
> systems actually work, starting with agents. Episode 01 answers "what
> happens when you give an AI a task?" for readers with no AI background:
> the agent loop is drawn and then comes alive, the context window is a
> glass volume that fills with token particles as you scroll, and the
> finale is a replayable run of an agent fixing a broken product page —
> transcript, context meter, and healing webpage side by side.
>
> The project is equal parts product thinking and engineering. The replay
> is powered by an open trace format I designed to mirror real agent
> transcripts: a zod-validated JSON schema with per-event token estimates
> and full artifact snapshots, played by a headless, unit-tested engine
> that renders any conforming file. The page holds 60fps with instanced
> WebGL particles and selective bloom, ships its full text in the HTML for
> search and AI crawlers, degrades cleanly without WebGL, and respects
> reduced motion. Built in public with Claude Code across six milestones —
> the decision log ships in the repo.
>
> Stack: React 19, React Three Fiber, GSAP + Lenis, zustand, zod, Tailwind v4, Vite.

## Recording the 15-second share clip (§1 hard requirement)

The composed-for-recording moment is S3 → S4 on desktop:

1. Open the episode page at 1440×900, hide the cursor, start at the top of S3.
2. Record: scroll slowly through the pinned context-window scene (~6s of
   particles streaming as you scrub), keep scrolling into S4, press play,
   let the replay run to the image-heal moment at EVT 11 (~7s).
3. Stop at the keyboard appearing. No editing needed — that's the clip.
