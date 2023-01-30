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

import browser from "webextension-polyfill";

function setStorage(name, value) {
  console.log(name, value);

  browser.storage.local
    .set({
      [name]: value,
    })
    .then(() => {
      if (browser.runtime.lastError) {
        console.log("error: ", browser.runtime.lastError);
      } else {
        // some code goes here.
        // console.log(name,' is set to ' + value,value);
      }
    });
}

function getStorage(name) {
  // console.log(name);
  browser.storage.local.get(name).then((result) => {
    // console.log(name,' is ' + value);
    if (browser.runtime.lastError) {
      console.log("Error retrieving index: " + browser.runtime.lastError);
      return;
    }
    return result[name];
  });
}

function removeStorage(name) {
  // console.log(name);
  browser.storage.local.remove(name).then(() => {
    // console.log(name,' is deleted');
  });
}

export { setStorage as set, getStorage as get, removeStorage as remove };
