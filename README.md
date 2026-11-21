# Playmaker Tackle

A free, offline tackle football playbook app for coaches. Open the [web app](https://breksos.github.io/PlayMakerX/) on any current browser, or download the Mac app and Windows installer from [Releases](https://github.com/breksos/PlayMakerX/releases). No account or subscription is needed.

## Open the Mac app

Download **Playmaker-Tackle-Mac.zip**, unzip it, and double-click **Playmaker Tackle.app**. The app opens directly to your playbook. Keep the app in one location after you start using it, and use **Export backup** regularly. macOS may warn that the free build is unsigned; use its Open Anyway option if you trust this repository.

On Windows, download **Playmaker-Tackle-Windows-…-Setup.exe** from Releases. Run it once; it creates a Desktop shortcut for future use. Windows may warn that the free build is unsigned. The web link above avoids installing software on either platform.

## Coaching tools

- Create multiple playbooks with unlimited offense, defense, and special teams plays.
- Set 6, 7, 8, 9, 11, or 12 players per side; save formations, categories, and personnel groups.
- Drag players, assign roster names, mark a target, draw routes, option routes, motion, blocks, zones, passes, and ball movement. Add text and assignment notes.
- Flip plays, choose line end caps and smooth paths, and animate routes at adjustable speed.
- Set team name, logo, color, and field theme.
- Print playbooks, call sheets, wristband diagrams, or wristband lists to paper or PDF.

Select **Draw route** or another drawing tool, click a player, click points on the field, then press **Finish path**. Use **Team setup** to add players and drag roster chips onto field positions.

## Local data and sharing

The app saves plays on the current device and browser. **Export backup** creates a `.json` file containing the whole team workspace; **Import backup** replaces the local workspace with one from another coach. A PDF can be shared for read-only viewing. There is no cloud sync or live multi-coach editing. Browser storage may be cleared, so export backups regularly.

## Browser version and development

For a Windows or Chromebook coach, send **Open Playmaker Tackle.html** and have them double-click it in a current browser. This is a single file with the same editor and no installation step. Browser storage for local files varies by browser, so use **Export backup** after each editing session. Browser data is separate from the Mac app until you export and import a backup.

Developers can also run the source as static files: `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765`.

To rebuild the Mac app on a Mac with Xcode command line tools and Pillow installed, run `sh native-macos/build-mac.sh`. The result is `dist/Playmaker Tackle.app`.

GitHub Actions checks JavaScript on every push and pull request. A push to `main` deploys the browser app and builds Mac and Windows downloads as workflow artifacts. Pushing a `v*` tag builds both apps and attaches them to a GitHub Release. The Windows installer and Mac ZIP are unsigned, so their operating systems may show the usual unknown-publisher warning. CI builds do not imply live testing on every Windows or Mac version.

This is independent software. It does not use Playmaker X code, artwork, or proprietary play packs.
