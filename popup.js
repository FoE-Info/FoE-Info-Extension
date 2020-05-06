 document.querySelector('#go-to-options').addEventListener("click", function() {
    // console.log('options');
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  }); 