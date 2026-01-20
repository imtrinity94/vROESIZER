// This script runs after the page loads
window.addEventListener("load", function () {
    // Track the current editor instance to detect changes (navigation)
    let lastEditor = null;
    let observer = null;

    // Function to check for editor changes
    function checkEditorState() {
        const { editor, version } = findEditor();

        if (editor) {
            // If we found an editor and it's different from the last one we saw
            if (editor !== lastEditor) {
                console.log(`New vRO editor detected (${version}). Initializing button...`);
                lastEditor = editor;
                setupResizeButton(editor, version);
            }
        } else {
            // No editor found. If we previously had one, we should probably remove the button
            if (lastEditor) {
                console.log('Editor removed from view. Removing button.');
                lastEditor = null;
                const existingBtn = document.getElementById('resize-btn');
                if (existingBtn) {
                    existingBtn.remove();
                }
            }
        }
    }

    // Start observing the document
    observer = new MutationObserver((mutations) => {
        // Debounce or just run check? 
        // Since finding editor is fast (querySelector), running on mutation is okay, 
        // but we can limit it if needed. For now, direct check is fine.
        checkEditorState();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false // We mostly care about nodes being added/removed
    });

    // Initial check
    checkEditorState();
    console.log('MutationObserver running to detect editor navigation/reloads');

    function setupResizeButton(editor, version = 'legacy') {
        console.log('Setting up resize button for version:', version);

        // Remove existing button if it exists
        const existingBtn = document.getElementById('resize-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // Create Floating Button
        let button = document.createElement("button");
        button.innerText = "MAXIMIZE";
        button.id = "resize-btn";

        // FORCE styles inline to ensure they override vRO defaults
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

        // Note: Main styles are also in styles.css as backup

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
                // Save original states using Computed Style to get exact pixel dimensions
                // This prevents issues where 'style.width' is empty (handled by flex/css class) 
                // and restoring it to empty causes collapse.
                if (firstPanel && !originalStates.has(firstPanel)) {
                    const computed = window.getComputedStyle(firstPanel);
                    originalStates.set(firstPanel, {
                        width: firstPanel.style.width || computed.width,
                        display: firstPanel.style.display || computed.display,
                        height: firstPanel.style.height || computed.height,
                        flex: firstPanel.style.flex || computed.flex
                    });
                }

                if (secondPanel && !originalStates.has(secondPanel)) {
                    const computed = window.getComputedStyle(secondPanel);
                    originalStates.set(secondPanel, {
                        width: secondPanel.style.width || computed.width,
                        display: secondPanel.style.display || computed.display,
                        height: secondPanel.style.height || computed.height,
                        flex: secondPanel.style.flex || computed.flex
                    });
                }

                // Add transition class for smooth animation
                if (firstPanel) firstPanel.classList.add('transition-element');
                if (secondPanel) secondPanel.classList.add('transition-element');

                if (!isActionView) {
                    // WORKFLOW VIEW Strategy (Horizontal Split):
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
                    // ACTION VIEW Strategy (Vertical Split):
                    if (secondPanel) {
                        secondPanel.style.display = "none";
                    }
                }

                if (gutter) {
                    gutter.style.display = "none";
                }

                // Hide elements
                elementsToToggle.forEach(el => {
                    if (el) {
                        if (!originalStates.has(el)) {
                            const computed = window.getComputedStyle(el);
                            originalStates.set(el, {
                                display: el.style.display, // Keep original inline display or undefined
                                computedDisplay: computed.display,
                                height: el.style.height || computed.height,
                                overflow: el.style.overflow || computed.overflow
                            });
                        }
                        el.style.display = "none";
                    }
                });

                // Maximize editor container
                const editorContainer = document.querySelector('.editor-box');
                if (editorContainer) {
                    if (!originalStates.has(editorContainer)) {
                        const computed = window.getComputedStyle(editorContainer);
                        originalStates.set(editorContainer, {
                            height: editorContainer.style.height || computed.height
                        });
                    }
                    editorContainer.style.height = "calc(100vh - 50px)";
                }

                // Maximize monaco editor
                const monacoEditor = document.querySelector('.monaco-editor');
                if (monacoEditor) {
                    if (!originalStates.has(monacoEditor)) {
                        const computed = window.getComputedStyle(monacoEditor);
                        originalStates.set(monacoEditor, {
                            height: monacoEditor.style.height || computed.height
                        });
                    }
                    monacoEditor.style.height = "calc(100vh - 70px)";
                }

                // Refresh layout
                setTimeout(function () {
                    if (window.monaco && window.monaco.editor) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors && editors.length) {
                            editors.forEach(ed => ed.layout());
                        }
                    }
                    window.dispatchEvent(new Event('resize'));
                }, 350);

                button.innerText = "RESTORE";
            } else {
                // RESTORE LOGIC

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
                const editorContainer = document.querySelector('.editor-box');
                if (editorContainer && originalStates.has(editorContainer)) {
                    editorContainer.style.height = originalStates.get(editorContainer).height;
                }

                // Restore monaco editor
                const monacoEditor = document.querySelector('.monaco-editor');
                if (monacoEditor && originalStates.has(monacoEditor)) {
                    monacoEditor.style.height = originalStates.get(monacoEditor).height;
                }

                // Refresh layout
                setTimeout(function () {
                    if (window.monaco && window.monaco.editor) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors && editors.length) {
                            editors.forEach(ed => ed.layout());
                        }
                    }
                    window.dispatchEvent(new Event('resize'));
                }, 350);

                button.innerText = "MAXIMIZE";
            }
        });
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        // Restore position from localStorage if available
        const savedPos = localStorage.getItem('vro-resizer-btn-pos');
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                // Ensure the saved position is within valid bounds (simple check)
                if (pos.top >= 0 && pos.left >= 0 &&
                    pos.top < window.innerHeight && pos.left < window.innerWidth) {

                    element.style.top = pos.top + "px";
                    element.style.left = pos.left + "px";
                    element.style.bottom = 'auto';
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

            // Save new position to localStorage
            const rect = element.getBoundingClientRect();
            localStorage.setItem('vro-resizer-btn-pos', JSON.stringify({
                top: rect.top,
                left: rect.left
            }));

            // Small timeout to allow the click event to fire (or be blocked) 
            // before resetting drag state if needed, though we check attribute in click handler
        }
    }
});
