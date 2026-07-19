# Launch kit

Ready-to-post material for launching Agent Anatomy. Episode 01 material is below;
the Episode 1.5 ("failure-modes sequel") second launch is at the bottom.

## Episode 01

Attach the share clip
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

---

# Second launch — Episode 1.5 ("the failure-modes sequel")

Post this once Episode 01 has had its run. Lead with the eviction clip — the
oldest tokens falling out the bottom of a full window is the whole hook.

## X thread (3 posts)

**Post 1 (with the eviction clip):**

> Episode 01 of Agent Anatomy showed the agent loop *working*.
>
> It doesn't always. Here's what "the context window filled up" actually looks
> like — the oldest tokens, including the original request, evicting out the
> bottom while the agent keeps going:
>
> https://wenhaoyu-bryan.github.io/agent-anatomy/episodes/where-agents-go-wrong/

**Post 2:**

> Three failure modes, each a short replay you can scrub:
>
> — the loop trap: it retries the same broken fix forever
> — context overflow: it answers a question that scrolled out of memory
> — a bad observation it *catches* by verifying instead of trusting a cache
>
> The last one carries the point.

**Post 3:**

> Good agents aren't the ones that never err — they're the ones instrumented to
> notice. That's the episode.
>
> Same open engine as Ep 01, three new JSON traces. The schema grew one event
> (context eviction) and stayed backward compatible — the format's second
> consumer, in public: https://github.com/wenhaoyu-bryan/agent-anatomy

## Recording the eviction clip

The share moment is F2 (Failure 02 · Context overflow):

1. Open the 1.5 page at 1440×900, hide the cursor, scroll to the F2 vignette
   with the particle window at rest (full to the brim, ~98%).
2. Press play. Record the fill topping out, then the oldest colored band sinking
   and fading out the bottom as the meter drops (~98% → ~68%), and the transcript
   delivering the confidently-wrong answer.
3. Stop once the post-eviction reply lands. ~12–15s, no editing.

---

# Third launch — Episode 02 ("How AI reads the web")

This episode has a second audience: the marketer / site-owner who wants to know
why AI cites some pages and not others. Lead the X thread with the citation-thread
clip (the answer assembling with lines back to its sources); run a separate
LinkedIn post aimed at the SEO/GEO crowd. Both clip-first.

## X thread (3 posts)

**Post 1 (with the citation-threads clip):**

> When an AI answers with sources, where do those citations actually come from?
>
> I built an interactive explainer. Ask it "is it safe to reheat rice?" — it
> searches, reads the trustworthy pages, hits one it *can't* read, and writes an
> answer that threads every claim back to its source, live:
>
> https://wenhaoyu-bryan.github.io/agent-anatomy/episodes/how-ai-reads-the-web/

**Post 2:**

> The quiet moment that matters: one page renders its text with JavaScript, so the
> fetcher gets an empty shell. It contributes nothing.
>
> A page a machine can't read is a page it can't cite. You can watch it get
> skipped.

**Post 3:**

> Same open engine as Episodes 01 and 1.5 — this is the third JSON trace it plays,
> no forks. The schema grew search, page fetches, and citations, and stayed
> backward compatible.
>
> Three episodes, one engine: https://github.com/wenhaoyu-bryan/agent-anatomy

## LinkedIn post (marketing / SEO / GEO audience)

> "How do I get my content cited by AI?" is the new "how do I rank on Google?" —
> and most of the advice is guesswork.
>
> So I built something you can just watch: an interactive replay of an AI
> answering a real question — "is it safe to reheat rice?" — by searching the web
> and citing its sources. No slides, no funnel diagrams. The actual mechanism.
>
> Three things decide which pages it uses, and you can see each one happen:
>
> 1. It has to READ the page. One source renders its content with JavaScript; the
>    fetcher gets an empty shell and moves on. Server-rendered HTML wins.
> 2. It has to EXTRACT the answer. The pages that got cited put the answer in
>    clear prose near the top — not buried under menus and preamble.
> 3. It has to TRUST the page. Between two readable sources, it leaned on the one
>    with specific, checkable substance.
>
> That's "GEO" with the jargon removed: write pages a person — and the machine
> reading on their behalf — can actually read.
>
> Watch it (60 seconds): https://wenhaoyu-bryan.github.io/agent-anatomy/episodes/how-ai-reads-the-web/

## Recording the citation-threads clip (the share moment)

The composed moment is S5 with the answer assembling:

1. Open the Episode 02 page at 1440×900, hide the cursor, scroll to the S5 replay
   with the timeline at the start.
2. Press play. Let it run through the search and the fetches (watch the source
   chips light, and the recipe blog dim with an ✕), and keep recording as the
   answer writes in and the citation threads draw on from each cited span back to
   its source chip.
3. Stop a beat after the last thread lands. ~14s, no editing. (Hover a citation at
   the end to show the highlight, if you want a second beat.)

# Fourth launch — Episode 03 ("How agents remember") · season finale

The season closer, and the angle is personal: *your AI doesn't remember you — here's
what it actually does instead.* Lead the thread with the compaction clip (the crowded
window collapsing into a small grey block), then land the season-finale note and the
open invitation for episode 04. Clip-first.

## X thread (4 posts)

**Post 1 (with the compaction clip):**

> "Does ChatGPT remember me?" Mostly no. When a session ends, the context window is
> wiped — nothing is saved in the model.
>
> So how does an agent finish a long job? Watch it compress its own memory into a
> smaller, lossier summary, in real time:
>
> https://wenhaoyu-bryan.github.io/agent-anatomy/episodes/how-agents-remember/

**Post 2:**

> The trick is a distinction people miss: context vs. memory.
>
> Context is what's in the window right now — finite, and wiped at the end.
> Memory is what the agent writes to a *file*, outside the window, so it survives.
> Notes, not neurons.

**Post 3:**

> The honest moment: play through the session break and the window empties
> completely — every particle gone. The next day, in a blank window, the agent
> reads its own notes back and picks up exactly where it left off.

**Post 4:**

> That's the season: how an agent works → where they go wrong → how they read the
> web → how they remember. Four episodes, one replay engine, one JSON format that
> only ever grew backward-compatibly.
>
> What should I open up next? → https://github.com/wenhaoyu-bryan/agent-anatomy/issues/new?template=episode-suggestion.md

## Recording the compaction clip (the share moment)

The composed moment is S3 — the pinned compaction scene — for a clean, deterministic
recording:

1. Open the Episode 03 page at 1440×900, hide the cursor, scroll to the "Compaction"
   section until it pins.
2. Scroll down slowly and evenly through the section. The window fills with colorful
   research particles (the CTX readout climbing toward 2,225 / 2,400), holds full,
   then the reads draw down, flare, and collapse into a single small, dim grey block
   as the readout drops to 925.
3. Stop a beat after the grey block settles. ~12s, no editing.

For a second beat, the S5 replay's `session_break` (the window emptying while the
memory file stays put in the panel) is the emotional counterpart — record it if you
want a two-scene cut.
