const el = document.createElement("script");
el.src = chrome.runtime.getURL("resource.js");
(document.head || document.documentElement).appendChild(el);
