# Changelog

All notable changes to vROESIZER (vRO Code Editor Resizer) are listed here, newest first.

## 2.1.1 - 2026-11-20

### Fixed
- **Chrome Web Store review (excessive permissions).** Removed the unused `activeTab` permission and the unused `host_permissions` entry. The extension now requests no permissions at all.

### Changed
- The content script is injected only on the Orchestrator client path (`/orchestration-ui`), which is the same in 8.x and 9.x, instead of on every website.
- 8.x safety net: if the 9.x strategy finds no split panes around the editor, MAXIMIZE falls back to the 8.x (legacy) strategy instead of doing nothing.
- Popup text now refers to the MAXIMIZE button.

## 2.1.0 - 2026-11-20

Tested on VCF Operations Orchestrator 9.1.1 (build 25643527), embedded in VCF Automation.

### Fixed
- **Button missing on VCF 9.x.** The 9.x Orchestrator client runs inside an iframe (`/orchestration-ui/`) of VCF Automation. The content script only ran in the top page, so it never saw the editor. `manifest.json` now sets `"all_frames": true`.
- **Actions on 9.x did not widen.** The 9.x action view puts the script editor next to an API Explorer / Properties pane; the old selectors only knew the workflow layout, so the editor grew by a few pixels only. MAXIMIZE now takes the full width (911 px to 1872 px in the test lab).
- **Layout stuck after leaving a maximized editor.** Switching tab or navigating away while maximized left panels hidden. The layout is now put back automatically.
- A new `<style>` element was added to the page every time the button was created.

### Changed
- 9.x maximize is now structural: it walks up from the editor and, in every `split-layout` on the way, hides the other panes and lets the editor's pane fill the space. It uses CSS classes only, so RESTORE simply removes them. Works for workflows and actions.
- The script only activates in the Orchestrator client (`/orchestration-ui/` path or `o11n-app` root element), not on every site with a Monaco editor.
- Editor detection after DOM changes runs at most once per animation frame.
- 8.x (legacy) maximize / restore logic is unchanged.

## 2.0.1

- Manifest update.

## 2.0.0

- New button design matching the Clarity Design System.
- Restore uses the exact pixel sizes captured before maximizing, preventing layout collapse.
- Draggable button with remembered position; stays inside the window when it is resized.
- Support for Actions (8.x) and navigation between workflows / actions without reload.
- See [issue-fixes.md](issue-fixes.md) for details.

## 1.0

- Initial release: Maximize Editor button for workflow scriptable tasks.
