# FoE Info

# How to build the project

- Clone the repository
- Run `npm install` to install dependencies
- Run `npm run dev` to start the development build watcher, or `npm run build` for production
- Run `npm run verify` to run formatting, i18n parity, unit tests, and build checks

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
