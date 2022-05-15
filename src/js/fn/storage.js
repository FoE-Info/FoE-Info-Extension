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
function setStorage(name,value){
	// console.debug(name,value);

    chrome.storage.local.set({
        [name]: value
    }, function() {
      if(chrome.runtime.lastError){
        console.debug("error saving: ",name,value, chrome.runtime.lastError.message);
    }else{
        // some code goes here.
        console.debug(name,' is set to ' + value,value);
      }
    });

}

 function getStorage(name){
	// console.debug(name);
    chrome.storage.local.get(name, function(result) {
    // console.debug(name,' is ' + value);
    if (chrome.runtime.lastError) {
      console.debug("Error retrieving index: " + chrome.runtime.lastError.message);
      return null;
    }
    return result[name];
    });

}

 function removeStorage(name){
	// console.debug(name);
    chrome.storage.local.remove(name, function() {
		// console.debug(name,' is deleted');
    });

}

export {setStorage as set};
export {getStorage as get};
export {removeStorage as remove};