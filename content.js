// This script runs after the page loads
window.addEventListener("load", function() {
    // Function to find the Monaco editor in vRO
    function findEditor() {
        // Look for the Monaco editor container
        let editor = document.querySelector(".monaco-editor");
        
        // If we can't find it directly, try other selectors
        if (!editor) {
            editor = document.querySelector("[data-mpt]") || 
                     document.querySelector(".monaco-scrollable-element");
        }
        
        return editor;
    }
    
    // Check for editor periodically as it might load dynamically
    let checkInterval = setInterval(function() {
        let editor = findEditor();
        
        if (editor) {
            clearInterval(checkInterval);
            setupResizeButton(editor);
            console.log("vRO editor found and resize button added");
        }
    }, 1000);
    
    function setupResizeButton(editor) {
        // Create Floating Button
        let button = document.createElement("button");
        button.innerText = "Maximize Editor";
        button.id = "resize-btn";
        button.style.position = "fixed";
        button.style.bottom = "20px";
        button.style.right = "20px";
        button.style.zIndex = "9999";
        button.style.backgroundColor = "#007bff";
        button.style.color = "white";
        button.style.border = "none";
        button.style.padding = "10px 15px";
        button.style.fontSize = "14px";
        button.style.cursor = "pointer";
        button.style.borderRadius = "5px";
        button.style.boxShadow = "0 2px 5px rgba(0,0,0,0.3)";
        
        document.body.appendChild(button);
        
        // Add transition styles to head
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .transition-element {
                transition: all 0.3s ease-in-out !important;
            }
            #resize-btn {
                transition: background-color 0.2s ease-in-out;
            }
            #resize-btn:hover {
                background-color: #0056b3;
            }
        `;
        document.head.appendChild(styleElement);
        
        // Store original states
        let originalStates = new Map();
        let expanded = false;
        
        button.addEventListener("click", function() {
            expanded = !expanded;
            
            // Find the split layout container
            const splitLayout = document.querySelector('split-layout');
            const firstPanel = document.querySelector('.firstPanel');
            const secondPanel = document.querySelector('.secondPanel');
            const gutter = document.querySelector('.gutter-horizontal');
            
            // Find elements to hide for vertical space
            const elementsToToggle = [
                document.querySelector('.button-bar'),
                document.querySelector('.prototypes > clr-tabs > ul'),
                document.querySelector('#parameter-pills'),
                document.querySelector('.actions'),
                document.querySelector('.collapse-element-container') // Added collapse element container
            ];
            
            if (expanded) {
                // Save original states before modifying (only on first expansion)
                if (firstPanel && !originalStates.has(firstPanel)) {
                    originalStates.set(firstPanel, {
                        width: firstPanel.style.width,
                        display: firstPanel.style.display
                    });
                }
                
                if (secondPanel && !originalStates.has(secondPanel)) {
                    originalStates.set(secondPanel, {
                        width: secondPanel.style.width
                    });
                }
                
                // Add transition class for smooth animation
                if (firstPanel) firstPanel.classList.add('transition-element');
                if (secondPanel) secondPanel.classList.add('transition-element');
                
                // Maximize editor horizontally by adjusting the split
                if (firstPanel) {
                    firstPanel.style.width = "5%";
                    setTimeout(() => {
                        firstPanel.style.display = "none";
                    }, 300);
                }
                
                if (secondPanel) {
                    secondPanel.style.width = "95%";
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
                    
                    editorContainer.style.height = "calc(100vh - 150px)";
                }
                
                // Find the Monaco editor instance and maximize it
                const monacoEditor = document.querySelector('.monaco-editor');
                if (monacoEditor) {
                    if (!originalStates.has(monacoEditor)) {
                        originalStates.set(monacoEditor, {
                            height: monacoEditor.style.height || getComputedStyle(monacoEditor).height
                        });
                    }
                    
                    monacoEditor.style.height = "calc(100vh - 170px)";
                }
                
                // Force Monaco editor to refresh its layout
                setTimeout(function() {
                    if (window.monaco && window.monaco.editor) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors && editors.length) {
                            editors.forEach(ed => ed.layout());
                        }
                    }
                    
                    // Dispatch resize event to trigger any internal resize handlers
                    window.dispatchEvent(new Event('resize'));
                }, 350);
                
                button.innerText = "Restore Editor";
            } else {
                // Restore original states
                if (firstPanel && originalStates.has(firstPanel)) {
                    const state = originalStates.get(firstPanel);
                    firstPanel.style.display = state.display || "";
                    
                    // Short delay to ensure display change takes effect before width animation
                    setTimeout(() => {
                        firstPanel.style.width = state.width || "";
                    }, 10);
                }
                
                if (secondPanel && originalStates.has(secondPanel)) {
                    secondPanel.style.width = originalStates.get(secondPanel).width || "";
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
                setTimeout(function() {
                    if (window.monaco && window.monaco.editor) {
                        const editors = window.monaco.editor.getEditors();
                        if (editors && editors.length) {
                            editors.forEach(ed => ed.layout());
                        }
                    }
                    
                    window.dispatchEvent(new Event('resize'));
                }, 350);
                
                button.innerText = "Maximize Editor";
            }
        });
    }
});
