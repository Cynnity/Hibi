# Hibi patch notes

Everything that's changed in Hibi, newest first. Versions 0.1 to 1.0 all happened in one late night (October 20–21, 2026).

---

## 1.7 — "Player 2 has joined" (Oct 21)
- **New Games mode 🎮** with Playing, Library, Add and Stats tabs.
- **Track every game:** Playing, Want to play, On hold, Beaten, 100% and Dropped, plus hours played, what you play it on, genres, notes and favorites.
- **Game search** finds the cover, genres, platforms and release year (game data from RAWG).
- **Sort and filter by genre.** Sort by Genre to see your games grouped under headings, or tap a genre to see only those games. You can also sort by rating, hours played, title or release year.
- **+1 h and +30 min buttons** to log play time. Logging time on a backlog game starts it for you.
- **Game stats:** hours played, games beaten this year, your average rating, a breakdown by genre and your most-played games.
- **New 1 to 10 ring rating** everywhere, replacing the stars. Your old Shows & Books ratings were doubled, so 4 stars is now an 8. AniList imports now bring in your 10-point scores.
- A Playing card on Home.
- **Fixed:** the mode switcher could push the screen a few pixels sideways.

## 1.6 — "Behind the scenes" (Oct 21)
- **Crash reports.** If something breaks, Hibi saves a report of what went wrong. It doesn't include any of your personal data.
- **Reports go to Dropbox** when it's connected, in a crash-reports folder next to your backups.
- **No more blank screens.** If a screen can't load, you get a "Something went wrong" card with Reload and Copy report buttons. Your data stays safe.
- **Crash reports card** in Settings shows up only when there's a report. Copy them and send them to Claude to get them fixed.
- **Cleaned up the code.** The app used to be one 3,000-line file. It's now split into tidy files for each part (gym, Japan, shows, savings, school, Dropbox and so on), so fixes and new features are easier and safer.
- Updates now always download every file together, so you never end up with half an update.

## 1.5 — "Cloud save" (Oct 21)
- **Dropbox auto backup.** Connect once in Settings and Hibi backs up on its own a few seconds after every change and when you open the app.
- **Progress photos back up too.** Before this they only lived on your phone.
- **A copy for each day** goes in a daily folder, in case you ever need to go back.
- **Restore from Dropbox** brings everything back, photos included. Handy for a new phone or your iPad.
- Hibi only sees its own folder in Dropbox › Apps, and your Dropbox sign-in never goes into backup files.
- No internet? It backs up when you're back online.
- The "over a week since your last backup" reminder goes away once Dropbox is on.

## 1.4 — "Side quest" (Oct 21)
- **Cardio has its own section** on the Workout tab, separate from your lifting routines. Tap Treadmill or StairMaster to log it on its own.
- **Log it or time it:** type in your numbers and Save, or tap **Start a timer instead**. A live clock runs on the Workout tab, and when you tap Done your minutes are already filled in.
- Blank boxes reuse last time's numbers, so a repeat session takes one tap.
- Cardio no longer counts as a workout and doesn't move your rotation along.
- During a lifting workout there's a Cardio card at the bottom for a warm-up or finisher. It saves separately.
- Cardio machines are no longer in the lifting exercise picker, and the Cardio category is off the Start by category list.
- **Cardio log** on the Progress tab, under the Cardio card, with every session and a Delete button. Cardio you logged inside workouts in 1.3 still counts there.

## 1.3 — "Cardio arc" (Oct 21)
- **Treadmill tracking:** log minutes, speed, incline and distance. Leave distance blank and Hibi works it out from your speed and time.
- **StairMaster tracking:** log minutes, level and floors.
- New **Cardio** category in the Gym with Treadmill and StairMaster already in your library. If you had a treadmill exercise from your Hevy import, it switched over to cardio on its own.
- **Any exercise can be cardio:** in the Library, open it and pick a Type (Weights, Treadmill, Stairs or Other cardio). New exercises let you pick a type too.
- **Cardio progress:** a Cardio card on the Progress tab with this week's minutes, distance and floors, and charts for incline, minutes, distance, speed, level or floors, plus your bests.
- The Workout tab's This week card shows your cardio totals too.
- Cardio skips the rest timer and doesn't count toward lifting PRs.
- Hevy imports now bring in cardio time and distance.
- **3 new badges:** Cardio Era (10 hours of cardio), Stairway to Heaven (500 floors) and **12-3-30** (30+ minutes at 12% incline).

## 1.2.2 — "Organized arc" (Oct 21)
- **Templates are now a tidy list** on the Workout tab. Each one shows its name and how many exercises it has. Tap it to see the exercises, then tap Start.
- The template that's next in your rotation has a **Next** tag.
- You can fold the whole Templates list away when you don't need it.
- **Fixed:** templates with lots of exercises stretched past the edge of the screen and pushed everything sideways.

## 1.2.1 — "Fresh coat" (Oct 21)
- **Really fixed the Home Screen icon this time.** Your phone had saved a copy of the old broken icon and kept showing it. The icon now has a new file name, so your phone has to download the fixed one.
- Updates now always download fresh files instead of reusing old saved copies.

## 1.2 — "Spring cleaning" (Oct 21)
- **Archive instead of delete.** Hide things you're done with without losing them:
  - **Gym:** workout categories, exercises and templates. Archived templates drop out of the rotation.
  - **School:** classes from past semesters. Their homework leaves Due and Home.
  - **Savings:** goals you've finished or put on pause.
  - **Shows & Books:** any title. There's a new **Archived** filter in Library.
- Each list has an **Archived** section at the bottom, with **Restore** to bring things back.

## 1.1.1 — "Touch-up" (Oct 21)
- **Fixed the Home Screen icon.** The pink background only covered the top-left corner and the rest showed up white. Now the whole icon is pink behind the sakura.

## 1.1 — "Wardrobe change" (Oct 21)
- **Patch notes in the app:** go to Settings, then About, then What's new. They work offline too.
- **"Hibi was updated" card** on Home after each update, with a button to see what changed.
- **5 new themes:**
  - **Ink:** black background with white everything else, like Mono flipped.
  - **Matcha:** soft green tea with a peach accent.
  - **Aqua:** teal and pink.
  - **Neon:** Tokyo-at-night pink and cyan.
  - **Royal:** navy and gold.
- That's 11 themes in total.

---

## 1.0 — "Hibi" (Oct 21)
*Final form unlocked.*

- **New name: Hibi.** Japanese for "everyday life," because it stopped being just a gym app a while ago.
- **New logo:** a white sakura blossom with a bold manga-style outline and a cyan sparkle.
- **Moved to GitHub Pages** at `cynnity.github.io/Hibi`, with offline support and its own Home Screen icon.
- **Update banner:** when a new version lands on GitHub, the app shows a Reload button.
- **Fixed:** the Home Screen icon showing a plain "H." Some extra code at the top of the page was hiding the icon from Safari.
- Backups are now saved as `hibi-backup-(date).json`.

## 0.9.5 — "Party assembled" (Oct 21)
- **Home screen:** one card per mode, showing your next workout, classes and homework due, the Japan countdown, what you're watching and reading, and your closest savings goals.
- **School mode:** homework, exams, quizzes, labs and projects grouped into Overdue, Today, This week and Later. Also class schedules, grades with letter averages, and searchable notes (starting with a Quick reference for Ohm's law, power, resistors and the resistor color code).
- **Passcode lock:** a 4-digit code when the app opens and after a minute in the background.
- **Modes menu:** hide modes you're not using and put them in any order, using ↑ and ↓ buttons.
- **Savings upgrades:** split your paycheck across goals, set a "dream amount" above your minimum, and link goals to the Japan budget.
- The mode switcher went compact: icons only, plus the full name of the mode you're in.

## 0.9.4 — "Bank arc" (Oct 21)
- **Savings mode:** goals with icons, targets and dates. Quick +$5 to +$100 buttons, plus "save $X per paycheck" plans and an estimate of when you'll finish at your current pace.
- History with a chart of what you saved each month.
- Ideas to start from: Ado VIP tickets, an art commission, the Arkansas wedding trip, a Corolla SE and an emergency fund.
- 🎉 when a goal is reached.

## 0.9.3 — "Simulcast" (Oct 21)
- **Import from AniList** using just your username, including statuses, progress, scores, covers and finish dates.
- **Airing times:** "Ep 7 in 5 hours" and "3 new episodes out" on the Now tab.
- **Settings split by mode:** each mode only shows the settings that apply to it.
- The app version is now shown in Settings.

## 0.9.2 — "Cover art" (Oct 21)
- **Search for covers and details** from AniList (anime, manga, manhwa, light novels), TVmaze (TV shows) and Open Library (books).
- Picking a result fills in the cover, type and total episodes or chapters.
- Colored letter tiles appear when there's no cover.

## 0.9.1 — "Watchlist" (Oct 21)
- **Shows & Books mode:** In progress, Want to start, On hold, Finished and Dropped.
- **Now tab** with +1 Ep and +1 Ch buttons. Titles finish on their own when you hit the last episode or chapter.
- Ratings, favorites, release days, where to watch, notes, search, filters and stats.

## 0.9 — "Isekai'd to Japan" (Oct 21)
- **Mode switcher:** the app can now hold more than workouts.
- **Japan mode:**
  - Countdown and Tokyo clock.
  - Calendar itinerary where flights and check-ins show up on their own.
  - Budget with spending in yen or dollars.
  - Live yen converter.
  - Flights and Airbnb or hotel details, with door codes and Wi-Fi.
  - Packing list, places to visit, 16 phrases, and emergency numbers.
- **Later in 0.9:**
  - A Today card during the trip.
  - A pre-trip to-do list with due dates (Visit Japan Web, eSIM, Suica and more).
  - A gift list and a daily trip journal.
  - Export your plans to iPhone Calendar.

## 0.8 — "Training arc" (Oct 20)
- **Workout templates** you can start with one tap.
- **Rotation:** Upper, Lower, Push, Pull and Legs in your order, so the app knows what's next.
- **Progression hints** that tell you when to add weight.
- **Plate calculator** that draws the bar and lists the plates for each side.
- Retired: the water tracker, steps and sleep. Your other apps already do those.
- The muscle diagram is now tucked away during workouts.

## 0.7 — "Remaster" (Oct 20)
- Rebuilt the whole app from scratch for cleaner code and fewer bugs.
- New front and back muscle diagrams with separate muscles: abs, obliques, lats, glutes, both calf heads and more.
- New navigation with icons and switches between sections.
- Smoother charts, a floating rest timer and better empty screens.

## 0.6 — "Achievement hunter" (Oct 20)
- **38 badges**, from real milestones (One Plate Bench, Million Club) to silly ones (It's Over 9000, Plus Ultra, Filler Episode, Skipped Leg Day).
- **6 themes:** Sakura, Midnight, Ocean, Forest, Sunset and Mono.
- Import workouts from a **Hevy** export.
- Streaks were added and then removed in favor of badges.

## 0.5 — "Filler episode" (Oct 20)
- Removed the Japanese text from the screens.
- Added a water counter, steps and streaks. None of them made it to 1.0. Rest in peace.
- Backups can be saved as files.

## 0.4 — "Daily grind" (Oct 20)
- **Supplements tracker** for creatine, omega-3 and anything else, with a 7-day view.
- Tabs reorganized into five sections, and a wider layout for iPad.
- More detailed muscle diagrams.

## 0.3 — "Body and mind" (Oct 20)
- Muscle diagrams, body weight tracking and progress photos.
- A daily journal with mood.
- Line charts for body weight and lifts, plus personal records.
- A stretching and basic care tab.

## 0.2 — "Anime glow-up" (Oct 20)
- Sakura theme with manga-panel cards.
- Pick which muscles a workout hits.
- An exercise library with how-tos, muscles and Upper, Lower, Push, Pull and Legs categories you can rearrange.
- Progress bars for every exercise.

## 0.1 — "First rep" (Oct 20)
- Log workouts with sets, weight and reps.
- A rest timer that starts when you check off a set.
- Workout history and backup.
- It was called Lift Log back then.
