{
    "name": "",
        "short_name": "",
            // "version": "0.0.17",
            "manifest_version": 2,
                "minimum_chrome_version": "10.0",
                    "description": "Essential Info for Forge of Empires addicts",
                        "homepage_url": "https://foe-info.github.io",
                            "browser_action": {
        "default_popup": "popup.html"
    },
    "externally_connectable": {
        "matches": ["https://*.forgeofempires.com/game/*"]
    },
    "devtools_page": "devtools.html",
        "options_ui": {
        "page": "options.html",
            "open_in_tab": false
    },
    "icons": {
        "16": "images/Icon16.png",
            "24": "images/Icon24.png",
                "32": "images/Icon32.png",
                    "48": "images/Icon48.png",
                        "64": "images/Icon64.png",
                            "128": "images/Icon128.png"
    },
    "permissions": [
        "storage",
        "clipboardWrite",
        "https://*.forgeofempires.com/game/*",
        // "identity",
        "*://*.google.com/*",
        "https://*.googleusercontent.com/"
    ],
        // "oauth2": {
        // "client_id": "243920292418-fs1tq25ndqeohg93o64gfe9orq8leobe.apps.googleusercontent.com",
        // "scopes": [
        // "https://www.googleapis.com/auth/spreadsheets"
        // ]
        // }
        "content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'"
}
