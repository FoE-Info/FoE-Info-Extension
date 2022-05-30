/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 * 
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 * 
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
import browser from 'webextension-polyfill';

console.debug()
browser.devtools.panels.create(EXT_NAME, null, 'panel.html');

// browser.devtools.panels.create(EXT_NAME, null, 'panel.html',
//     function(panel) {
//         // panel.themeName("dark");
//     }
// );

// browser.storage.local.get('tool').then( (result) => {
//     // post.log('result', result);
//     // console.log('result', result);
//     // console.log('showIncidents', showIncidents);
//         if(result.tool && result.tool.hasOwnProperty('mode')){
//             // console.log('stealth mode is ' + toolMode);
//             if(result.tool.mode)
//                 browser.devtools.panels.create(EXT_NAME, null, 'panel.html');
//         }
// });
