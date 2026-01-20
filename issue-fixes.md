# Issue Fixes & Code Changes Report (v2.0.0)

This document summarizes the changes, bug fixes, and enhancements implemented to improve the stability and usability of the vRO Code Resizer extension.

## 1. Button Visibility & Positioning
*   **Issue:** The "MAXIMIZE" button was sometimes not visible, or it would disappear when resizing the window. In some cases, it was clipped by other vRO UI elements.
*   **Fix:**
    *   **Direct DOM Injection:** Removed the intermediate wrapper container and now append the button directly to `document.body`. This ensures it sits on top of all other elements (`z-index: 999999`).
    *   **Window Awareness:** Added a `resize` event listener to the window. If the window is resized and the button would end up off-screen, it automatically repositions itself to stay within the viewport.
    *   **Draggable Persistence:** The button is now draggable. Its position is saved to `localStorage` (`vro-resizer-btn-pos`). On page reload, it reappears exactly where you left it.

## 2. Robust State Restoration (The "Collapse" Bug)
*   **Issue:** When clicking "RESTORE", the editor or sidebars would sometimes collapse to a tiny width or height, or completely disappear, requiring a manual page refresh to fix.
*   **Fix:**
    *   **Computed Styles:** Instead of saving inline styles (which are often empty for flex elements), the code now captures the exact `window.getComputedStyle()` pixel values for `width`, `height`, and `flex` properties *before* maximization.
    *   **Exact Restoration:** When restoring, these specific pixel values are re-applied, ensuring the layout returns to the exact state it was in before you clicked Maximize.

## 3. Navigation & Single Page Application (SPA) Support
*   **Issue:** When navigating between different workflows or actions without refreshing the page, the button would sometimes disappear or remain in the wrong state (e.g., showing "RESTORE" when the view was already reset).
*   **Fix:**
    *   **Continuous Observation:** Implemented a `MutationObserver` that watches for changes to the editor DOM nodes.
    *   **Auto-Reset:** When a new editor instance is detected (navigation event), the extension automatically re-initializes the button and resets its state to "MAXIMIZE", preventing state desynchronization.

## 4. Fix: ReferenceError (Missing Functions)
*   **Issue:** Users encountered an `Uncaught ReferenceError: findEditor is not defined`.
*   **Fix:** Restored the `findEditor` and `detectVROVersion` helper functions which were accidentally removed during a previous refactoring cleanup.

## 5. UI/UX Migration to Clarity Design
*   **Change:** To make the extension feel native to vRealize Orchestrator, the styling was updated to match the **Clarity Design System**.
*   **Details:**
    *   Font set to **Metropolis**.
    *   Primary Blue color: `#0072a3`.
    *   Removed SVG icons for a cleaner, text-only "MAXIMIZE / RESTORE" look.
    *   Added smooth CSS transitions (`0.3s ease-in-out`) for resizing actions.

## 6. Version 2.0.0 Release
*   Updated `manifest.json` version to `2.0.0`.
*   Updated `README.md` with a new "What's New" section.
