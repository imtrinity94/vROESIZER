// This script runs after the page loads
window.addEventListener("load", function () {
    // Track if we've already set up the observer
    let observerSetUp = false;
    // Function to detect VCF Operations Orchestrator version
    function detectVROVersion() {
        // Check for VCF Ops Orchestrator 9+ elements
        const isVCF9 = document.querySelector('split-layout[class*="horizontal"]') !== null ||
            document.querySelector('.schema-area-container') !== null;

        return isVCF9 ? 'vcf9' : 'legacy';
    }

    // Function to find the Monaco editor in vRO
    function findEditor() {
        const version = detectVROVersion();
        let editor;

        if (version === 'vcf9') {
            // For VCF 9+
            editor = document.querySelector('.monaco-editor') ||
                document.querySelector('.editor-panel') ||
                document.querySelector('.split-right');
        } else {
            // Legacy vRO
            editor = document.querySelector(".monaco-editor") ||
                document.querySelector("[data-mpt]") ||
                document.querySelector(".monaco-scrollable-element");
        }

        return { editor, version };
    }

    // Function to initialize the extension
    function initializeExtension() {
        const { editor, version } = findEditor();
        if (editor) {
            setupResizeButton(editor, version);
            console.log(`vRO editor found (${version}) and resize button added`);
            return true;
        }
        return false;
    }

    // Initial check
    if (!initializeExtension() && !observerSetUp) {
        // If editor not found, set up a MutationObserver
        const observer = new MutationObserver((mutations, obs) => {
            if (initializeExtension()) {
                // Stop observing once we've found and set up the editor
                obs.disconnect();
                observerSetUp = false;
            }
        });

        // Start observing the document with the configured parameters
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
        });
        observerSetUp = true;
        console.log('MutationObserver started to detect editor loading');
    }

    function setupResizeButton(editor, version = 'legacy') {
        console.log('Setting up resize button for version:', version);

        // Remove existing button if it exists
        const existingBtn = document.getElementById('resize-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Create Floating Button
        let button = document.createElement("button");
        button.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            <span>Maximize Editor</span>
        `;
        button.id = "resize-btn";
        // Note: Main styles are in styles.css

        // Add to a fixed position container to prevent being hidden
        let container = document.getElementById('vro-resizer-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'vro-resizer-container';
            container.style.position = 'fixed';
            container.style.bottom = '0';
            container.style.right = '0';
            container.style.zIndex = '999999';
            document.body.appendChild(container);
        }
        container.appendChild(button);
        console.log('Button added to container in DOM');

        // Add transition styles to head
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .transition-element {
                transition: all 0.3s ease-in-out !important;
            }
        `;
        document.head.appendChild(styleElement);

        // Make the button draggable
        makeDraggable(button);


        // Store original states
        let originalStates = new Map();
        let expanded = false;

        button.addEventListener("click", function (e) {
            // If the button was being dragged, don't trigger the click action
            if (button.getAttribute('data-dragged') === 'true') {
                return;
            }

            expanded = !expanded;

            // Version-specific element selection
            let splitLayout, firstPanel, secondPanel, gutter, elementsToToggle;
            let isActionView = false;

            if (version === 'vcf9') {
                // VCF 9+ specific elements
                splitLayout = document.querySelector('split-layout.horizontal');
                firstPanel = document.querySelector('.schema-area-container .firstPanel');
                secondPanel = document.querySelector('.schema-area-container .secondPanel');
                gutter = document.querySelector('.schema-area-container .gutter-horizontal') || document.querySelector('.schema-area-container .gutter');

                elementsToToggle = [
                    document.querySelector('.button-bar'),
                    document.querySelector('.prototypes > clr-tabs > ul'),
                    document.querySelector('#parameter-pills'),
                    document.querySelector('.actions'),
                    document.querySelector('.collapse-element-container'),
                    document.querySelector('.schema-area-container .button-bar')
                ];
            } else {
                // Legacy vRO elements (also covers Action views which might fall here)
                splitLayout = document.querySelector('split-layout');
                firstPanel = document.querySelector('.firstPanel');
                secondPanel = document.querySelector('.secondPanel');

                // Detect Action View: First panel is usually the editor area in Actions (Vertical Split)
                if (firstPanel && firstPanel.classList.contains('editor-area')) {
                    isActionView = true;
                }

                // More robust gutter selector handles both horizontal and vertical layouts
                gutter = document.querySelector('.gutter-horizontal') ||
                    document.querySelector('.gutter-vertical') ||
                    document.querySelector('.gutter');

                elementsToToggle = [
                    document.querySelector('.button-bar'),
                    document.querySelector('.prototypes > clr-tabs > ul'),
                    document.querySelector('.action-header'), // Header in Action view
                    document.querySelector('#parameter-pills'),
                    document.querySelector('.actions'),
                    document.querySelector('.collapse-element-container')
                ];
            }

            if (expanded) {
                // Save original states before modifying (only on first expansion)
                if (firstPanel && !originalStates.has(firstPanel)) {
                    originalStates.set(firstPanel, {
                        width: firstPanel.style.width,
                        display: firstPanel.style.display,
                        height: firstPanel.style.height || getComputedStyle(firstPanel).height,
                        flex: firstPanel.style.flex || getComputedStyle(firstPanel).flex
                    });
                }

                if (secondPanel && !originalStates.has(secondPanel)) {
                    originalStates.set(secondPanel, {
                        width: secondPanel.style.width,
                        display: secondPanel.style.display,
                        height: secondPanel.style.height || getComputedStyle(secondPanel).height
                    });
                }

                // Add transition class for smooth animation
                if (firstPanel) firstPanel.classList.add('transition-element');
                if (secondPanel) secondPanel.classList.add('transition-element');

                if (!isActionView) {
                    // WORKFLOW VIEW Strategy (Horizontal Split):
                    // Hide FIRST panel (Schema/Sidebar) to expand SECOND panel (Editor)
                    if (firstPanel) {
                        firstPanel.style.width = "5%";
                        setTimeout(() => {
                            if (expanded) firstPanel.style.display = "none";
                        }, 300);
                    }

                    if (secondPanel) {
                        secondPanel.style.width = "95%";
                    }
                } else {
                    // ACTION VIEW Strategy (Vertical Split or Editor in First Panel):
                    // Keep FIRST panel (Editor). Hide SECOND panel (Logs/Details) if present.
                    if (secondPanel) {
                        secondPanel.style.display = "none";
                    }
                    if (firstPanel) {
                        // Ensure first panel takes full available space in the split
                        // For vertical split, height is key, but usually flex handles it if 2nd is hidden
                        // We might not need to set specific styles if we hide the other panel and gutter
                    }
                }

                if (gutter) {
                    gutter.style.display = "none";
                }

                // Hide elements to increase vertical space - always hide regardless of saved state
                elementsToToggle.forEach(el => {
                    if (el) {
                        // Save original state only on first expansion
                        if (!originalStates.has(el)) {
                            originalStates.set(el, {
                                display: el.style.display || getComputedStyle(el).display,
                                height: el.style.height || getComputedStyle(el).height,
                                overflow: el.style.overflow || getComputedStyle(el).overflow
                            });
                        }

                        // Always hide the element when expanding
                        el.style.display = "none";
                    }
                });

                // Find the editor container and maximize its height
                const editorContainer = document.querySelector('.editor-box');
                if (editorContainer) {
                    if (!originalStates.has(editorContainer)) {
                        originalStates.set(editorContainer, {
                            height: editorContainer.style.height || getComputedStyle(editorContainer).height
                        });
                    }

                    editorContainer.style.height = "calc(100vh - 50px)"; // Reduced offset since we hide headers
                }

                // Find the Monaco editor instance and maximize it
                const monacoEditor = document.querySelector('.monaco-editor');
                if (monacoEditor) {
                    if (!originalStates.has(monacoEditor)) {
                        originalStates.set(monacoEditor, {
                            height: monacoEditor.style.height || getComputedStyle(monacoEditor).height
                        });
                    }

                    monacoEditor.style.height = "calc(100vh - 70px)"; // Reduced offset
                }

                // Force Monaco editor to refresh its layout
                setTimeout(function () {
                    if (window.monaco && window.monaco.editor) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors && editors.length) {
                            editors.forEach(ed => ed.layout());
                        }
                    }

                    // Dispatch resize event to trigger any internal resize handlers
                    window.dispatchEvent(new Event('resize'));
                }, 350);

                button.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
                    </svg>
                    <span>Restore Editor</span>
                `;
            } else {
                // Restore original states
                if (firstPanel && originalStates.has(firstPanel)) {
                    const state = originalStates.get(firstPanel);
                    firstPanel.style.display = state.display || "";

                    if (!isActionView) {
                        // Short delay to ensure display change takes effect before width animation
                        setTimeout(() => {
                            firstPanel.style.width = state.width || "";
                        }, 10);
                    } else {
                        firstPanel.style.height = state.height || "";
                        firstPanel.style.flex = state.flex || "";
                    }
                }

                if (secondPanel && originalStates.has(secondPanel)) {
                    const state = originalStates.get(secondPanel);
                    secondPanel.style.width = state.width || "";
                    secondPanel.style.display = state.display || "";
                    secondPanel.style.height = state.height || "";
                }

                if (gutter) {
                    gutter.style.display = "";
                }

                // Restore hidden elements
                elementsToToggle.forEach(el => {
                    if (el && originalStates.has(el)) {
                        const state = originalStates.get(el);
                        el.style.display = state.display || "";
                        el.style.height = state.height || "";
                        el.style.overflow = state.overflow || "";
                    }
                });

                // Restore editor container height
                const editorContainer = document.querySelector('.editor-box');
                if (editorContainer && originalStates.has(editorContainer)) {
                    editorContainer.style.height = originalStates.get(editorContainer).height || "";
                }

                // Restore Monaco editor height
                const monacoEditor = document.querySelector('.monaco-editor');
                if (monacoEditor && originalStates.has(monacoEditor)) {
                    monacoEditor.style.height = originalStates.get(monacoEditor).height || "";
                }

                // Force layout refresh
                setTimeout(function () {
                    if (window.monaco && window.monaco.editor) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors && editors.length) {
                            editors.forEach(ed => ed.layout());
                        }
                    }

                    window.dispatchEvent(new Event('resize'));
                }, 350);

                button.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                    </svg>
                    <span>Maximize Editor</span>
                `;
            }
        });
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            // Only drag on left click
            if (e.button !== 0) return;

            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Mark as not dragged initially
            element.setAttribute('data-dragged', 'false');

            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;

            // Calculate current position to switch from bottom/right to top/left
            const rect = element.getBoundingClientRect();
            element.style.left = rect.left + 'px';
            element.style.top = rect.top + 'px';
            element.style.bottom = 'auto';
            element.style.right = 'auto';
            element.style.position = 'fixed'; // Ensure it stays fixed

            // Disable transition and increase opacity during drag
            element.style.transition = 'none';
            element.style.opacity = '0.9';
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();

            // Mark as dragged
            element.setAttribute('data-dragged', 'true');

            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // set the element's new position:
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;

            // Restore styles
            element.style.transition = 'background-color 0.3s, opacity 0.3s';
            element.style.opacity = ''; // Revert to CSS default (0.4 or 1 on hover)

            // Small timeout to allow the click event to fire (or be blocked) 
            // before resetting drag state if needed, though we check attribute in click handler
        }
    }
});
