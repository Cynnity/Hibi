# Hibi

Hibi is Cynn's personal everything app: a single-page web app (`index.html`) hosted on GitHub Pages at https://cynnity.github.io/Hibi/ and installed on his iPhone's Home Screen. All user data lives on his phone, not on GitHub.

## Every change must update the patch notes

Cynn wants a record of everything that changes. For every change you ship, in the same commit:

1. **Add an entry to the top of `CHANGELOG.md`.** Include the version, a short fun episode-style title in quotes, the date, and plain-language bullets about what changed for him. Follow the style of the entries already there.
2. **Bump `APP_VERSION`** in `index.html`. Use 1.1 → 1.2 for features and 1.1 → 1.1.1 for small fixes. The version must match the new CHANGELOG entry.
3. **Bump the cache name** `V` in `sw.js` to match, like `hibi-v1.2`, so installed apps download the update and show the Reload bar.

The app shows `CHANGELOG.md` in Settings, then About, then "What's new". It also shows a "Hibi was updated" card on Home whenever `APP_VERSION` changes.

## Don't break his data

- Never rename the storage keys: `liftlog:v1` (localStorage), `liftlog` (IndexedDB for photos), or the `liftlog:` passcode salt. Changing them wipes his data.
- Never rename the repository or change the Pages path. A new address is a new app on iPhone, with empty storage.
- New fields must be optional and filled in by the `normalize*` functions, so older saved data keeps loading.

## Before pushing

- `index.html` must start with `<!DOCTYPE html>`. If a copy came from a claude.ai artifact, strip the wrapper the artifact viewer adds before it, or the Home Screen icon and name break.
- Check the script parses and the app loads with no console errors.
- No Japanese text in the app's own interface, except the Japan mode phrases list.
