# smolvanillabean

A tiny handmade personal site, built with [Zola](https://www.getzola.org/) (a single static-site-generator binary, no node_modules, no build pipeline).

## Running it locally

1. [Install Zola](https://www.getzola.org/documentation/getting-started/installation/) (one binary, no deps).
2. From this folder: `zola serve`
3. Open `http://127.0.0.1:1111`

`zola build` produces the deployable site in `public/`.

## How it's organized

```
config.toml         ← site-wide data: nav links, sidebar status, footer badges
content/             ← one folder per page, markdown + front matter
  _index.md           home page copy
  now/                "now" page
  journal/            blog-style entries (sorted by date automatically)
  scrapbook/           corkboard notes, stored as data (extra.notes)
  recipes/, places/, links/, guestbook/
templates/
  base.html            shared shell: marquee, header, sidebar, footer
  index.html           homepage layout
  section.html         ← generic template used by now/recipes/places/links/guestbook
  journal_list.html    journal index (the "update log")
  journal_single.html  one journal entry
  scrapbook.html       full corkboard
  macros/               small reusable pieces (nav, box, note) — imported wherever needed
sass/
  style.scss            imports the partials below, compiles to /style.css
  _tokens.scss           colors + fonts, change the whole vibe from here
  _base.scss, _layout.scss, _components.scss, _corkboard.scss
static/
  js/main.js             visitor counter + cursor sparkle, no build step
```

## Adding things

**A new nav page** (e.g. `/desk/`):
1. Add one line to `nav` in `config.toml`.
2. `mkdir content/desk && content/desk/_index.md` with `template = "section.html"`.
That's it — no template edits needed for a plain content page.

**A new journal entry:**
Add a markdown file under `content/journal/` with `title` and `date` front matter. It's picked up automatically by both the homepage preview and `/journal/`.

**A new scrapbook note:**
Add an entry to the `notes` array in `content/scrapbook/_index.md`. The same array feeds both the homepage corkboard preview (first 4) and the full `/scrapbook/` page.

**Changing colors/fonts:**
Edit `sass/_tokens.scss` only — every component reads from those variables.

**Buttons or the guestbook form on a plain page:**
`section.html` opts in via `extra.buttons` (pixel button row) or `extra.guestbook = true` (decorative form) in that page's front matter — see `content/links/_index.md` and `content/guestbook/_index.md`.

## `/sessions/` — the friends-only vlog/podcast archive

A clean, neutral-styled page (deliberately un-scrapbooky — system font, gray/white cards, like a tiny private media app) behind a shared passphrase.

**How it works:** you set a passphrase, the site stores its SHA-256 hash in `config.toml`. A visitor types a passphrase in; the browser hashes it and compares to that stored hash. Only on a match does it fetch `static/data/episodes.json` and build the episode grid.

**What this actually protects against:** search engines, your professor stumbling onto the link, randoms who find the URL. That's it.

**What it does *not* protect against:** anyone who opens browser devtools. The hash is sitting in the page source (view-source works), and someone who's willing to inspect the Network tab can see `/data/episodes.json` and the raw media URLs once they legitimately unlock it, or brute-force the hash offline since it's unsalted. This is a **soft gate, not real access control** — treat it the same as an unlisted YouTube link: fine for "not googleable, only people I send it to," not fine for anything you'd be upset about a stranger seeing.

If you want something closer to actually private:
- **Cloudflare Access** or **Netlify password protection** — real server-side gating in front of the whole `/sessions/` path, no code needed.
- **Vimeo's password protection** — enforced by Vimeo's servers, a meaningfully stronger guarantee than a static site can give on its own.

**Using unlisted YouTube (what this project is set up for):**
1. Upload the video, set visibility to **Unlisted**.
2. Get the video ID from the URL (`youtube.com/watch?v=`**`THIS_PART`**).
3. Use `https://www.youtube-nocookie.com/embed/THIS_PART` as `src` in `episodes.json` — the `-nocookie` domain skips setting tracking cookies until someone actually presses play, which fits "private content" better than the standard embed domain.
4. Worth knowing: unlisted just means *not discoverable/not on your channel page* — anyone who ever gets the raw YouTube link can watch it directly, bypassing this site's passphrase entirely, and it can still end up indexed if it gets embedded/linked publicly elsewhere. It's an extra layer of obscurity stacked with the gate, not a hard privacy guarantee on its own — same spirit as the gate itself.

**Changing the passphrase:**
```
printf '%s' "your-new-passphrase" | shasum -a 256
```
Paste the resulting hash into `sessions_passphrase_hash` in `config.toml`.

**Adding an episode:** add an object to `static/data/episodes.json` with the unlisted video's embed URL as `src`. `type: "video"` / `"audio"` are still supported by the player code if you ever self-host a file instead, but the default setup assumes everything's an unlisted YouTube upload.

## Deploying

Push to GitHub, then connect the repo to Cloudflare Pages or Netlify with build command `zola build` and output directory `public`. No other config needed.
