// vROESIZER - vRO Code Editor Resizer
// Adds a MAXIMIZE / RESTORE button to the Orchestrator script editor.
//
// Supported:
//   - vRO / Aria Automation Orchestrator 8.x (standalone client)
//   - VCF Operations Orchestrator 9.x (9.0, 9.1, 9.1.1). In 9.x the Orchestrator
//     client runs inside an iframe of VCF Automation, so this script is injected
//     into every frame (see "all_frames" in manifest.json) and only activates in
//     the frame that actually hosts the Orchestrator client.
(function () {
    // Guard against double injection in the same frame
    if (window.__vroesizerLoaded) {
        return;
    }
    window.__vroesizerLoaded = true;

    const LOG = '[vROESIZER]';
    const BUTTON_ID = 'resize-btn';
    const STYLE_ID = 'vroesizer-style';
    const HIDE_CLASS = 'vroesizer-hide';
    const FILL_WIDTH_CLASS = 'vroesizer-fill-width';
    const FILL_HEIGHT_CLASS = 'vroesizer-fill-height';

    // Only run in the Orchestrator client, not on every page that has a Monaco editor
    function isOrchestratorPage() {
        return /\/orchestration-ui(\/|$)/.test(window.location.pathname) ||
            !!document.querySelector('o11n-app');
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

    function init() {
        if (!isOrchestratorPage()) {
            return;
        }

        // Track the current editor instance to detect changes (navigation)
        let lastEditor = null;
        // Restore function of the currently maximized editor (null when not maximized)
        let activeRestore = null;
        let checkScheduled = false;

        injectStyles();

        // Function to find the editor in the DOM
        function findEditor() {
            const editor = document.querySelector('.monaco-editor');
            if (!editor) {
                return { editor: null, version: null };
            }
            return { editor: editor, version: detectVROVersion() };
        }

        // Function to detect the Orchestrator UI generation
        function detectVROVersion() {
            // VCF 9.x (and any build using nested horizontal split layouts)
            if (document.querySelector('split-layout.horizontal')) {
                return 'vcf9';
            }
            return 'legacy'; // Default to legacy (8.x)
        }

        function restoreIfMaximized() {
            if (activeRestore) {
                try {
                    activeRestore();
                } catch (err) {
                    console.error(LOG, 'Error while restoring layout:', err);
                }
                activeRestore = null;
            }
        }

        // Function to check for editor changes
        function checkEditorState() {
            const { editor, version } = findEditor();

            if (editor) {
                // If we found an editor and it's different from the last one we saw
                if (editor !== lastEditor) {
                    console.log(`${LOG} New Orchestrator editor detected (${version}). Initializing button...`);
                    // The previous editor is gone: undo anything we changed for it
                    restoreIfMaximized();
                    lastEditor = editor;
                    setupResizeButton(editor);
                }
            } else if (lastEditor) {
                // Editor left the view (tab switch / navigation): undo our changes and remove the button
                console.log(`${LOG} Editor removed from view. Removing button.`);
                restoreIfMaximized();
                lastEditor = null;
                const existingBtn = document.getElementById(BUTTON_ID);
                if (existingBtn) {
                    existingBtn.remove();
                }
            }
        }

        // Observe the document, but run the check at most once per animation frame
        const observer = new MutationObserver(function () {
            if (checkScheduled) {
                return;
            }
            checkScheduled = true;
            window.requestAnimationFrame(function () {
                checkScheduled = false;
                checkEditorState();
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false // We mostly care about nodes being added/removed
        });

        // Initial check
        checkEditorState();

        function injectStyles() {
            if (document.getElementById(STYLE_ID)) {
                return;
            }
            const styleElement = document.createElement('style');
            styleElement.id = STYLE_ID;
            styleElement.textContent = `
                .transition-element {
                    transition: all 0.3s ease-in-out !important;
                }
                .${HIDE_CLASS} {
                    display: none !important;
                }
                .${FILL_WIDTH_CLASS} {
                    width: 100% !important;
                    max-width: none !important;
                    flex: 1 1 100% !important;
                }
                .${FILL_HEIGHT_CLASS} {
                    height: 100% !important;
                    max-height: none !important;
                    flex: 1 1 100% !important;
                }
            `;
            document.head.appendChild(styleElement);
        }

        // Ask Monaco and the Orchestrator layout to re-measure after a size change
        function refreshLayout() {
            [50, 350].forEach(function (delay) {
                setTimeout(function () {
                    if (window.monaco && window.monaco.editor && window.monaco.editor.getEditors) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors && editors.length) {
                            editors.forEach(ed => ed.layout());
                        }
                    }
                    window.dispatchEvent(new Event('resize'));
                }, delay);
            });
        }

        // ------------------------------------------------------------------
        // VCF 9.x strategy (workflows AND actions)
        //
        // The 9.x client nests several <split-layout> elements around the editor:
        //   workflow: [schema canvas | element editor] > [inputs panel | code]
        //   action:   [editor area / run details] > [script | API explorer + properties] > [inputs panel | code]
        // Instead of relying on view-specific selectors, walk up from the editor and,
        // in every split-layout on the way, hide the panes that do not contain the
        // editor and let the editor's pane take the full size. Everything is done
        // with CSS classes, so restoring is just removing those classes.
        // ------------------------------------------------------------------
        function maximizeVcf9(editor) {
            const touched = [];

            function mark(el, className) {
                if (el && !el.classList.contains(className)) {
                    el.classList.add(className);
                    touched.push({ el: el, className: className });
                }
            }

            let node = editor;
            while (node && node !== document.body) {
                const parent = node.parentElement;
                if (parent && parent.tagName === 'SPLIT-LAYOUT') {
                    const fillClass = parent.classList.contains('vertical') ? FILL_HEIGHT_CLASS : FILL_WIDTH_CLASS;
                    Array.from(parent.children).forEach(function (child) {
                        if (child === node) {
                            mark(child, fillClass);
                        } else if (child.classList.contains('firstPanel') ||
                            child.classList.contains('secondPanel') ||
                            child.classList.contains('gutter')) {
                            mark(child, HIDE_CLASS);
                        }
                    });
                }
                node = parent;
            }

            // Extra chrome around the editor that only costs vertical space
            const chromeSelectors = [
                '.button-bar',
                '.prototypes > clr-tabs > ul',
                '.action-header',
                '#parameter-pills',
                '.actions',
                '.collapse-element-container'
            ];
            chromeSelectors.forEach(function (selector) {
                document.querySelectorAll(selector).forEach(function (el) {
                    if (!el.contains(editor)) {
                        mark(el, HIDE_CLASS);
                    }
                });
            });

            refreshLayout();

            // Return the restore function
            return function restoreVcf9() {
                touched.forEach(function (entry) {
                    entry.el.classList.remove(entry.className);
                });
                refreshLayout();
            };
        }

        // ------------------------------------------------------------------
        // Legacy strategy (vRO / Aria Automation Orchestrator 8.x) - unchanged logic
        // ------------------------------------------------------------------
        function maximizeLegacy() {
            const originalStates = new Map();
            let isActionView = false;

            const firstPanel = document.querySelector('.firstPanel');
            const secondPanel = document.querySelector('.secondPanel');

            // Detect Action View: First panel is usually the editor area in Actions (Vertical Split)
            if (firstPanel && firstPanel.classList.contains('editor-area')) {
                isActionView = true;
            }

            // More robust gutter selector handles both horizontal and vertical layouts
            const gutter = document.querySelector('.gutter-horizontal') ||
                document.querySelector('.gutter-vertical') ||
                document.querySelector('.gutter');

            const elementsToToggle = [
                document.querySelector('.button-bar'),
                document.querySelector('.prototypes > clr-tabs > ul'),
                document.querySelector('.action-header'), // Header in Action view
                document.querySelector('#parameter-pills'),
                document.querySelector('.actions'),
                document.querySelector('.collapse-element-container')
            ];

            const editorContainer = document.querySelector('.editor-box');
            const monacoEditor = document.querySelector('.monaco-editor');
            let maximized = true;

            // Save original states using Computed Style to get exact pixel dimensions.
            // This prevents issues where 'style.width' is empty (handled by flex/css class)
            // and restoring it to empty causes collapse.
            [firstPanel, secondPanel].forEach(function (panel) {
                if (panel) {
                    const computed = window.getComputedStyle(panel);
                    originalStates.set(panel, {
                        width: panel.style.width || computed.width,
                        display: panel.style.display || computed.display,
                        height: panel.style.height || computed.height,
                        flex: panel.style.flex || computed.flex
                    });
                    // Add transition class for smooth animation
                    panel.classList.add('transition-element');
                }
            });

            if (!isActionView) {
                // WORKFLOW VIEW Strategy (Horizontal Split):
                if (firstPanel) {
                    firstPanel.style.width = "5%";
                    setTimeout(() => {
                        if (maximized) firstPanel.style.display = "none";
                    }, 300);
                }

                if (secondPanel) {
                    secondPanel.style.width = "95%";
                }
            } else if (secondPanel) {
                // ACTION VIEW Strategy (Vertical Split):
                secondPanel.style.display = "none";
            }

            if (gutter) {
                gutter.style.display = "none";
            }

            // Hide elements
            elementsToToggle.forEach(el => {
                if (el) {
                    const computed = window.getComputedStyle(el);
                    originalStates.set(el, {
                        display: el.style.display, // Keep original inline display or undefined
                        height: el.style.height || computed.height,
                        overflow: el.style.overflow || computed.overflow
                    });
                    el.style.display = "none";
                }
            });

            // Maximize editor container
            if (editorContainer) {
                const computed = window.getComputedStyle(editorContainer);
                originalStates.set(editorContainer, {
                    height: editorContainer.style.height || computed.height
                });
                editorContainer.style.height = "calc(100vh - 50px)";
            }

            // Maximize monaco editor
            if (monacoEditor) {
                const computed = window.getComputedStyle(monacoEditor);
                originalStates.set(monacoEditor, {
                    height: monacoEditor.style.height || computed.height
                });
                monacoEditor.style.height = "calc(100vh - 70px)";
            }

            refreshLayout();

            // Return the restore function
            return function restoreLegacy() {
                maximized = false;

                if (firstPanel && originalStates.has(firstPanel)) {
                    const state = originalStates.get(firstPanel);
                    firstPanel.style.display = state.display || "";

                    if (!isActionView) {
                        setTimeout(() => {
                            // Restore explicit width if it was captured, otherwise empty string
                            firstPanel.style.width = state.width;
                        }, 10);
                    } else {
                        firstPanel.style.height = state.height;
                        firstPanel.style.flex = state.flex;
                    }
                }

                if (secondPanel && originalStates.has(secondPanel)) {
                    const state = originalStates.get(secondPanel);
                    secondPanel.style.width = state.width;
                    secondPanel.style.display = state.display || "";
                    secondPanel.style.height = state.height;
                    secondPanel.style.flex = state.flex;
                }

                if (gutter) {
                    gutter.style.display = "";
                }

                // Restore hidden elements
                elementsToToggle.forEach(el => {
                    if (el && originalStates.has(el)) {
                        const state = originalStates.get(el);
                        // Restore to inline style if it existed, otherwise remove display property to revert to css
                        el.style.display = state.display || "";
                        el.style.height = state.height;
                        el.style.overflow = state.overflow;
                    }
                });

                // Restore editor container
                if (editorContainer && originalStates.has(editorContainer)) {
                    editorContainer.style.height = originalStates.get(editorContainer).height;
                }

                // Restore monaco editor
                if (monacoEditor && originalStates.has(monacoEditor)) {
                    monacoEditor.style.height = originalStates.get(monacoEditor).height;
                }

                refreshLayout();
            };
        }

        function setupResizeButton(editor) {
            // Remove existing button if it exists
            const existingBtn = document.getElementById(BUTTON_ID);
            if (existingBtn) {
                existingBtn.remove();
            }

            // Create Floating Button
            let button = document.createElement("button");
            button.innerText = "MAXIMIZE";
            button.id = BUTTON_ID;
            button.type = "button";

            // FORCE styles inline to ensure they override Orchestrator defaults
            button.style.backgroundColor = "#0072a3";
            button.style.color = "#ffffff";
            button.style.border = "1px solid #0072a3";
            button.style.padding = "0 16px";
            button.style.textTransform = "uppercase";
            button.style.fontSize = "11px";
            button.style.fontWeight = "600";
            button.style.letterSpacing = "1px";
            button.style.borderRadius = "3px";
            button.style.height = "24px";
            button.style.lineHeight = "22px";
            button.style.cursor = "pointer";
            button.style.zIndex = "999999";
            button.style.boxShadow = "0 1px 2px rgba(0,0,0,0.15)";

            // Append directly to body to avoid container clipping/z-index issues
            document.body.appendChild(button);

            // Initial Position (Bottom Right)
            button.style.position = 'fixed';
            button.style.bottom = '30px';
            button.style.right = '30px';
            button.style.left = 'auto';
            button.style.top = 'auto';

            // Make the button draggable
            makeDraggable(button);

            button.addEventListener("click", function () {
                // If the button was being dragged, don't trigger the click action
                if (button.getAttribute('data-dragged') === 'true') {
                    return;
                }

                try {
                    if (activeRestore) {
                        restoreIfMaximized();
                        button.innerText = "MAXIMIZE";
                    } else {
                        // Detect the layout at click time: it can change while the editor stays open
                        activeRestore = detectVROVersion() === 'vcf9' ? maximizeVcf9(editor) : maximizeLegacy();
                        button.innerText = "RESTORE";
                    }
                } catch (err) {
                    console.error(LOG, "Error in resize click handler:", err);
                    // Fallback to simpler state if error occurs
                    button.innerText = "ERROR - RELOAD";
                }
            });
        }

        function makeDraggable(element) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
            let startX = 0, startY = 0;
            const dragThreshold = 5; // Pixels to move before counting as a drag
            let isDragging = false;

            // Restore position from localStorage if available
            const savedPos = localStorage.getItem('vro-resizer-btn-pos');
            if (savedPos) {
                try {
                    const pos = JSON.parse(savedPos);
                    // Ensure the saved position is within valid bounds (simple check)
                    if (pos.top && pos.left &&
                        pos.top >= 0 && pos.left >= 0 &&
                        pos.top < window.innerHeight && pos.left < window.innerWidth) {

                        element.style.top = pos.top + "px";
                        element.style.left = pos.left + "px";
                        element.style.bottom = 'auto'; // Disable bottom/right relative positioning
                        element.style.right = 'auto';
                        element.style.position = 'fixed';
                    }
                } catch (e) {
                    console.error("Error parsing saved button position", e);
                }
            }

            // Add window resize listener to ensure button stays visible
            window.addEventListener('resize', function () {
                const rect = element.getBoundingClientRect();
                let newTop = rect.top;
                let newLeft = rect.left;
                let needsUpdate = false;

                // Check if off-screen to the right
                if (rect.right > window.innerWidth) {
                    newLeft = window.innerWidth - rect.width - 20; // 20px padding
                    needsUpdate = true;
                }
                // Check if off-screen to the bottom
                if (rect.bottom > window.innerHeight) {
                    newTop = window.innerHeight - rect.height - 20; // 20px padding
                    needsUpdate = true;
                }
                // Check if off-screen to the left
                if (rect.left < 0) {
                    newLeft = 20;
                    needsUpdate = true;
                }
                // Check if off-screen to the top
                if (rect.top < 0) {
                    newTop = 20;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    element.style.top = newTop + "px";
                    element.style.left = newLeft + "px";

                    // Update localStorage with normalized position
                    localStorage.setItem('vro-resizer-btn-pos', JSON.stringify({
                        top: newTop,
                        left: newLeft
                    }));
                }
            });

            element.onmousedown = dragMouseDown;

            function dragMouseDown(e) {
                                e = e || window.event;
                // Only drag on left click
                if (e.button !== 0) return;

                e.preventDefault();
                // get the mouse cursor position at startup:
                pos3 = e.clientX;
                pos4 = e.clientY;
                startX = e.clientX;
                startY = e.clientY;
                isDragging = false; // Reset dragging state

                // Mark as not dragged initially
                element.setAttribute('data-dragged', 'false');

                document.onmouseup = closeDragElement;
                // call a function whenever the cursor moves:
                document.onmousemove = elementDrag;
            }

            function elementDrag(e) {
                e = e || window.event;
                e.preventDefault();

                // Calculate distance moved from start
                const distSq = (e.clientX - startX) ** 2 + (e.clientY - startY) ** 2;

                // Only start dragging if moved more than threshold
                if (!isDragging && distSq > dragThreshold ** 2) {
                    isDragging = true;
                    
                    // Calculate current position to switch from bottom/right to top/left (only once when drag starts)
                    const rect = element.getBoundingClientRect();
                    element.style.left = rect.left + 'px';
                    element.style.top = rect.top + 'px';
                    element.style.bottom = 'auto';
                    element.style.right = 'auto';
                    element.style.position = 'fixed'; // Ensure it stays fixed

                    // Disable transition and increase opacity during drag
                    element.style.transition = 'none';
                    element.style.opacity = '0.9';

                    // Mark as dragged
                    element.setAttribute('data-dragged', 'true');
                }

                if (isDragging) {
                    // calculate the new cursor position:
                    pos1 = pos3 - e.clientX;
                    pos2 = pos4 - e.clientY;
                    pos3 = e.clientX;
                    pos4 = e.clientY;

                    // set the element's new position:
                    element.style.top = (element.offsetTop - pos2) + "px";
                    element.style.left = (element.offsetLeft - pos1) + "px";
                }
            }

            function closeDragElement() {
                // stop moving when mouse button is released:
                document.onmouseup = null;
                document.onmousemove = null;

                if (isDragging) {
                    // Restore styles only if we were actually dragging
                    element.style.transition = 'background-color 0.3s, opacity 0.3s';
                    element.style.opacity = ''; // Revert to CSS default (0.4 or 1 on hover)

                    // Save new position to localStorage
                    const rect = element.getBoundingClientRect();
                    localStorage.setItem('vro-resizer-btn-pos', JSON.stringify({
                        top: rect.top,
                        left: rect.left
                    }));
                }

                isDragging = false;
            }
        }
    }
})();
