var proxied = window.XMLHttpRequest.prototype.open;

window.XMLHttpRequest.prototype.open = function () {
  this.addEventListener("readystatechange", () => {
    if (this.readyState === XMLHttpRequest.DONE) {
      if (this.responseURL.indexOf("metadata?id=city_entities") > -1) {
        // it seams that extension ID is not available in the unpacked mode.
        const extensionId = chrome.runtime.id ? chrome.runtime.id : "lkdcocmejceafmjmjgnmlbcjghphikhp";
        chrome.runtime.sendMessage(extensionId, { foe_city_entities: this.responseText });
      }
    }
  });
  return proxied.apply(this, [].slice.call(arguments));
};
