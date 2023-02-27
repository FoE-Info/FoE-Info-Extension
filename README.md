# FoE Info

# How to build the project

- Clone the repo
- Open in your IDE (eg [VS Code](https://code.visualstudio.com/download) / [IntelliJ](https://www.jetbrains.com/idea/download/))
- Open a terminal in your IDE, type `npm install` to install the project dependencies
- Open your IDE, and hit the `CTRL+SHIFT+P` keybinding and type `ext install esbenp.prettier-vscode` to install prettier in your IDE
- Type `npm run dev` to start the dev server (or you can use tasks in your IDE)

# Installation of the extension

- Open [chrome://extensions](chrome://extensions)
- Enable 'Developer Mode' checkbox
- Click 'Load unpacked extensions...'
- Select the `build/FoE-Info-Dev` folder

# Using the extension

- Open your browser, goto `https://en0.forgeofempires.com` (you may use a different language, of course)
- Ctrl-Shift-I to open devtools
- Click on `>>` in the devtools menu, then select `FoE-Info-Dev`
- Start the game to run FoE-Info
- You can click on the tools icon to change options

# Debugging

- Right-click on the FoE-Info panel and select `inspect`
- On the new window that opens, select `console` to see any errors or debug info
- You can also click on the FoE-Info logo to enable debug mode (this will output more info when you load the game)
