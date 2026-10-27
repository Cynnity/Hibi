# Hibi

Hibi is Cynn's personal everything app: a web app hosted on GitHub Pages at https://cynnity.github.io/Hibi/ and installed on his iPhone's Home Screen. All user data lives on his phone (and in his Dropbox if he connected it), not on GitHub.

## Where things are

Plain HTML, CSS and JavaScript with no build step. The scripts are classic scripts (not modules) that share one global scope, and they load in the order listed in `index.html`. Order matters: a file can only use, while it loads, functions from files above it.

| File | What's in it |
| --- | --- |
| `index.html` | The page shell and the list of scripts |
| `css/hibi.css` | All styles, the Paper look (the only theme; id `sakura` is kept so saved data loads; light and dark via `S.look.scheme`) and the card styles (`data-style`; `pop` is the Paper hairline style). Buttons and selected chips use `--btn` (ink by default, the accent when one is picked) |
| `js/crash.js` | Crash reports and the "Something went wrong" screen. Loads first. |
| `js/core.js` | `APP_VERSION`, constants, helpers, load/normalize/save, the mode list |
| `js/japan.js` | Japan trip mode (also defines `SAVE` and the form handler). Flights use airport time zones (`AIRPORT_TZ`, `zoned()`), and flights sharing a confirmation code count as one booking price (`flightBookings()`). |
| `js/media.js` | Shows & Books mode (anime/manga search uses AniList, falling back to MyAnimeList via Jikan, then Kitsu, then TVmaze for anime), plus the shared 1 to 10 `ring()` and `rater()` |
| `js/games.js` | Games mode (no hours; search uses RAWG, key is `RAWG_KEY` or `S.gm.key`), Up next queue |
| `js/savings.js` | Savings mode |
| `js/work.js` | Work mode: clock in/out, shifts, bonuses, pay periods, overtime and tax estimates (`S.wk`) |
| `js/home-school.js` | Update banner, Home, School (semesters, class times), hiding/ordering modes, passcode and Face ID, archive, patch notes |
| `js/focus.js` | School Focus tab: Pomodoro timer (`S.pomo`) |
| `js/cardio.js` | Cardio machines: fields, logs, charts |
| `js/music.js` | stats.fm top artists and tracks on Home and in Wrapped (`S.mu`) |
| `js/health.js` | Health mode: water in fl oz, habits with streaks, sleep (`S.hl`) |
| `js/lists.js` | Lists mode: shopping list and wish list with price history (`S.ls`) |
| `js/study.js` | School › Study › Flashcards (`S.fc`): decks imported from text (`fcParse()`: one card per line, `term :: definition`, `# Deck name`), Flashcards, Learn, Test, Match and spaced Review |
| `js/notebook.js` | School › Study › Notebooks (`S.nb`): Apple Pencil pages (strokes in IndexedDB store `nb`, page units 1000×1414), lecture recording (`REC`, audio chunks in store `rec`), live transcript, synced playback (`PLAY`), PDF export, Dropbox `notebooks/` and `recordings/` |
| `js/state.js` | `let S = load()` and other live state. Runs once everything above is defined. |
| `js/gym.js` | Lifting helpers, progression hints, plates, body diagram, charts, badges |
| `js/badges.js` | Badges for every mode, grouped by category, and the Badges screen. Loads before views.js. |
| `js/views.js` | Gym screens and the Settings screen |
| `js/widgets.js` | Home screen widgets (`WIDGETS` registry, `S.home.w` layout), customize mode and the Add widget sheet |
| `js/motion.js` | Welcome animation (`#splash` markup lives in index.html), screen transitions, `confetti()`, and the animation switches (`S.fx`) |
| `js/subs.js` | Subscriptions tab in Savings (`S.subs`), the Renewing soon alert on Home and its widget. Loads after widgets.js. |
| `js/budget.js` | Budget mode (`S.bg`): categories with sort words, `bgGuess()` auto-sorting, pay-period or month periods (`bgPeriodAt()` uses Work's `periodFor()`), `bgCalc()` safe-to-spend math, bills from `S.subs` plus `S.bg.bills`, plan per period, swipe Review deck, CSV import and export, Home widget. Loads after subs.js. |
| `js/receipt.js` | Budget receipt scanning: photo cleanup (`rcPrep`: crop, deskew, flatten lighting), the on-device reader driver (`rcEngine`, `rcRecognize`), the parser (`rcParse`: total with subtotal/tax check, date, merchant, card last 4, items), the scan card and `rcsave`. Receipt photos live in IndexedDB store `rc` (keyed by purchase id, `tx.rc=1`). Loads after budget.js. |
| `js/ocr-worker.js` | Web worker that runs Tesseract (LSTM) from `vendor/ocr/`. Not in `index.html`; `receipt.js` starts it. |
| `vendor/ocr/` | tesseract.js-core WASM (SIMD and plain) and the English model `eng.traineddata.gz`, with licences. Fetched on first scan and kept in the separate `hibi-ocr` cache, which `sw.js` does not clear on updates. |
| `js/ideas.js` | Ideas for Hibi list in Settings (`S.ideas`) and its Home widget |
| `js/recap.js` | Weekly recap on Home and Monthly/Yearly Wrapped slides. Uses `S.alog` (activity log of episodes, chapters and game hours) and `S.wrapSeen`. |
| `js/app.js` | `render()`, toasts, timers, Gym actions |
| `js/data.js` | Backup files, restore, Hevy import, photos (IndexedDB), themes |
| `js/look.js` | Accent color, light/dark (`S.look.scheme`), card style, mode emojis, app icons (`S.look`), the top bar (`appBar()`) and side menu (`menuSheet()`, `UI.menu`) that list every mode, the 🔎 screen finder, and the Settings sections |
| `js/events.js` | Tap, input and keyboard handling |
| `js/touch.js` | `haptic()`, swipe rows (`swipeWrap()`), drag to reorder (`data-sort` lists with a `.grip`, saved by `SORT`), Undo after a swipe delete |
| `js/dropbox.js` | Dropbox auto backup of data, photos and crash reports |
| `js/main.js` | Starts the app, and opens links like `?mode=gym`, `?tab=lshop` or `#water` |
| `sw.js` | Offline cache. Its `CORE` list must include every file above. |

## Every change must update the patch notes

Cynn wants a record of everything that changes. For every change you ship, in the same commit:

1. **Add an entry to the top of `CHANGELOG.md`.** Include the version, a short fun episode-style title in quotes, the date, and plain-language bullets about what changed for him. Follow the style of the entries already there.
2. **Bump `APP_VERSION`** at the top of `js/core.js`. Cynn wants this scheme: the middle number for new features (2.4 → 2.5), the last number for small fixes, tweaks and polish (2.4 → 2.4.1, 2.4.2), and the first number only for huge updates (3.0). Never reuse or lower a version that has shipped. The version must match the new CHANGELOG entry.
3. **Bump the cache name** `V` in `sw.js` to match, like `hibi-v3.2`, so installed apps download the update and show the Reload bar. If you add, rename or remove a file, update `CORE` in `sw.js` and the script list in `index.html`.

The app shows `CHANGELOG.md` in Settings, then About, then "What's new". It also shows a "Hibi was updated" card on Home whenever `APP_VERSION` changes.

## Don't break his data

- Never rename the storage keys: `liftlog:v1` (localStorage), `liftlog` (IndexedDB, version 3: stores `p` photos, `nb` notebook pages, `rec` recordings, `rc` receipt photos; only ever add stores), the `liftlog:` passcode salt, `liftlog:dbx` (Dropbox sign-in) or `liftlog:crash` (crash reports).
- Never rename or remove badge ids in `BADGES`; unlocked badges are stored by id in `S.bd`. Secret badges use kind `'secret'` and stay hidden as ??? until unlocked; their counters live in `S.sx`.
- Never rename widget ids in `WIDGETS`; his Home layout stores them in `S.home.w`. Changing them wipes his data.
- Never rename the repository or change the Pages path. A new address is a new app on iPhone, with empty storage.
- New fields must be optional and filled in by the `normalize*` functions, so older saved data keeps loading.
- Dropbox tokens stay in `liftlog:dbx` and must never go into backups or crash reports.

## Crash reports

`js/crash.js` records errors (message, stack, version, screen, last button tapped; no personal data) in `liftlog:crash`. They show in Settings under Crash reports and upload to Dropbox › Apps › his Hibi folder › `crash-reports/` when Dropbox is connected. If Cynn pastes a report, the file and line in the stack point to the bug.

## Before pushing

- `index.html` must start with `<!DOCTYPE html>`. If a copy came from a claude.ai artifact, strip the wrapper the artifact viewer adds before it, or the Home Screen icon and name break.
- Check every script parses (`node --check js/*.js sw.js`) and the app loads with no console errors and no new crash reports.
- No Japanese text in the app's own interface, except the Japan mode phrases list.
- Hibi runs on iPhone and iPad. Check layouts at phone widths (320 to 430) and iPad widths (768 to 1366, portrait and landscape). The iPad layout lives in the `min-width:700px` and `min-width:1100px` blocks at the end of `css/hibi.css`.
