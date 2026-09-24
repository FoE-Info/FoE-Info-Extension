const { createLogger } = require('../utils/logger.js');

const logger = createLogger('UiElementBindings');

function bindOptionsButton(targetDocument, browserObj, win) {
  if (!targetDocument || typeof targetDocument.querySelector !== 'function') {
    return null;
  }
  const optionsButton = targetDocument.querySelector('#go-to-options');
  if (!optionsButton || typeof optionsButton.addEventListener !== 'function') {
    return null;
  }
  optionsButton.addEventListener('click', function () {
    if (browserObj.runtime && browserObj.runtime.openOptionsPage) {
      browserObj.runtime.openOptionsPage();
    } else {
      win.open(browserObj.runtime.getURL('options.html'));
    }
  });
  logger.debug('bound #go-to-options click handler');
  return optionsButton;
}

function bindWindowMessageListener(win) {
  if (!win || typeof win.addEventListener !== 'function') return null;
  win.addEventListener(
    'message',
    function (event) {
      logger.debug('received response:', event?.data);
    },
    false,
  );
  return win;
}

function bindThemeToggle(win, targetDocument, onThemeChange) {
  if (!win || typeof win.matchMedia !== 'function') return null;
  const media = win.matchMedia('(prefers-color-scheme: dark)');
  if (!media || typeof media.addEventListener !== 'function') return null;
  media.addEventListener('change', ({ matches }) => {
    if (targetDocument?.body?.classList) {
      targetDocument.body.classList.toggle('bg-dark');
      targetDocument.body.classList.toggle('text-light');
    }
    logger.debug(matches ? 'change to dark mode!' : 'change to light mode!');
    if (typeof onThemeChange === 'function') onThemeChange(matches);
  });
  return media;
}

module.exports = {
  bindOptionsButton,
  bindWindowMessageListener,
  bindThemeToggle,
};
module.exports.default = module.exports;
