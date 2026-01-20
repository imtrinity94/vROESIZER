![image-removebg-preview (1)](https://github.com/user-attachments/assets/88896f0e-d85e-4c52-85aa-e0e4ba79fd63)

# vRŒSIZER - vRO Code Editor Resizer Chrome Extension

A Chrome Plugin to maximize the code editor area in Aria Automation Orchestrator (vRO) for developer friendliness.

![Demo gif](https://github.com/user-attachments/assets/2845aeea-cc01-4031-b3b6-7d7b135d9b41)


This extension is under review on Chrome Extension Store. (ID: gbgologffcmhapnjimcpipiljeaadgpf)

## Demo
https://github.com/user-attachments/assets/c86cf157-8974-4e4f-b1fa-da9b302534db

![icon](https://github.com/user-attachments/assets/6869f886-90ca-474d-aeb3-3206f7b5ff32) https://chromewebstore.google.com/detail/vro-code-editor-resizer/gbgologffcmhapnjimcpipiljeaadgpf

## 🛠️ How to Test Locally in Chrome

Since the extension is currently under review or if you want to test the latest changes locally, follow these steps:

1.  **Open Chrome Extensions Page**
    *   Open Google Chrome.
    *   Navigate to `chrome://extensions/` in the address bar.

2.  **Enable Developer Mode**
    *   Toggle the **"Developer mode"** switch in the top-right corner of the page to **ON**.

3.  **Load Unpacked Extension**
    *   Click the **"Load unpacked"** button that appears in the top-left menu.
    *   Select the root folder of this project (where `manifest.json` is located).
    *   *Note: Ensure you select the folder containing the files, not a zip file.*

4.  **Verify Installation**
    *   You should see "vRO Code Editor Resizer" appear in your list of extensions.
    *   Make sure it is enabled (blue toggle).

5.  **Test Functionality**
    *   Navigate to your vRealize Orchestrator (vRO) instance.
    *   Open a **Workflow** or an **Action** that has a script editor.
    *   Look for the blue **"Maximize Editor"** button in the bottom-right corner of the screen.
    *   **Click the button** to maximize the code editor.
        *   *Workflow View*: The sidebar should hide, and the editor should expand horizontally.
        *   *Action View*: The bottom details/log panel should hide, and the editor should expand vertically.
    *   **Click "Restore Editor"** to return the view to its original state.
    *   **Drag** the button if it obstructs any UI elements.

