# Hibi

Hibi is Cynn's personal everything app: a web app hosted on GitHub Pages at https://cynnity.github.io/Hibi/ and installed on his iPhone's Home Screen. All user data lives on his phone (and in his Dropbox if he connected it), not on GitHub.

## Where things are

Plain HTML, CSS and JavaScript with no build step. The scripts are classic scripts (not modules) that share one global scope, and they load in the order listed in `index.html`. Order matters: a file can only use, while it loads, functions from files above it.

| File | What's in it |
| --- | --- |
| `index.html` | The page shell and the list of scripts |
| `css/hibi.css` | All styles and the 11 themes |
| `js/crash.js` | Crash reports and the "Something went wrong" screen. Loads first. |
| `js/core.js` | `APP_VERSION`, constants, helpers, load/normalize/save, the mode list |
| `js/japan.js` | Japan trip mode (also defines `SAVE` and the form handler) |
| `js/media.js` | Shows & Books mode, plus the shared 1 to 10 `ring()` and `rater()` |
| `js/games.js` | Games mode (no hours; search uses RAWG, key is `RAWG_KEY` or `S.gm.key`), Up next queue |
| `js/savings.js` | Savings mode |
| `js/work.js` | Work mode: clock in/out, shifts, bonuses, pay periods, overtime and tax estimates (`S.wk`) |
| `js/home-school.js` | Update banner, Home, School (semesters, class times), hiding/ordering modes, passcode and Face ID, archive, patch notes |
| `js/focus.js` | School Focus tab: Pomodoro timer (`S.pomo`) |
| `js/cardio.js` | Cardio machines: fields, logs, charts |
| `js/music.js` | stats.fm top artists and tracks on Home and in Wrapped (`S.mu`) |
| `js/state.js` | `let S = load()` and other live state. Runs once everything above is defined. |
| `js/gym.js` | Lifting helpers, progression hints, plates, body diagram, charts, badges |
| `js/badges.js` | Badges for every mode, grouped by category, and the Badges screen. Loads before views.js. |
| `js/views.js` | Gym screens and the Settings screen |
| `js/widgets.js` | Home screen widgets (`WIDGETS` registry, `S.home.w` layout), customize mode and the Add widget sheet |
| `js/recap.js` | Weekly recap on Home and Monthly/Yearly Wrapped slides. Uses `S.alog` (activity log of episodes, chapters and game hours) and `S.wrapSeen`. |
| `js/app.js` | `render()`, toasts, timers, Gym actions |
| `js/data.js` | Backup files, restore, Hevy import, photos (IndexedDB), themes |
| `js/events.js` | Tap, input and keyboard handling |
| `js/dropbox.js` | Dropbox auto backup of data, photos and crash reports |
| `js/main.js` | Starts the app |
| `sw.js` | Offline cache. Its `CORE` list must include every file above. |

## Every change must update the patch notes

Cynn wants a record of everything that changes. For every change you ship, in the same commit:

1. **Add an entry to the top of `CHANGELOG.md`.** Include the version, a short fun episode-style title in quotes, the date, and plain-language bullets about what changed for him. Follow the style of the entries already there.
2. **Bump `APP_VERSION`** at the top of `js/core.js`. Use 1.1 → 1.2 for features and 1.1 → 1.1.1 for small fixes. The version must match the new CHANGELOG entry.
3. **Bump the cache name** `V` in `sw.js` to match, like `hibi-v2.0`, so installed apps download the update and show the Reload bar. If you add, rename or remove a file, update `CORE` in `sw.js` and the script list in `index.html`.

The app shows `CHANGELOG.md` in Settings, then About, then "What's new". It also shows a "Hibi was updated" card on Home whenever `APP_VERSION` changes.

## Don't break his data

- Never rename the storage keys: `liftlog:v1` (localStorage), `liftlog` (IndexedDB for photos), the `liftlog:` passcode salt, `liftlog:dbx` (Dropbox sign-in) or `liftlog:crash` (crash reports).
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
