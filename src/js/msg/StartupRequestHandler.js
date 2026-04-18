import browser from 'webextension-polyfill';

export function handleStartupServiceRequest(msg, request, deps) {
  if (
    !msg ||
    msg.requestClass !== 'StartupService' ||
    msg.requestMethod !== 'getData'
  ) {
    return false;
  }

  const {
    setGameOrigin,
    getGameOrigin,
    MyInfo,
    receiveStorage,
    output,
    overview,
    cityinvested,
    cityrewards,
    incidents,
    donationDIV,
    greatbuilding,
    gvg,
    guild,
    citystats,
    visitstats,
    cultural,
    metadataLoaded,
    startupService,
    setPendingStartupMsg,
  } = deps;

  let contentType = request.request.headers.find(
    (header) => header.name === ':authority',
  );
  if (contentType) setGameOrigin(contentType.value.split('.')[0]);
  console.debug('GameOrigin:', getGameOrigin());

  browser.storage.local.getBytesInUse(null).then((size) => {
    console.debug('getBytesInUse', size);
  });

  browser.storage.local.get(null).then((result) => {
    if (result[getGameOrigin() + 'MyInfo'])
      MyInfo.guildPosition = result[getGameOrigin() + 'MyInfo'].guildPosition;
    else MyInfo.guildPosition = 0;
    receiveStorage(result);
  });

  output.innerHTML = ``;
  overview.innerHTML = ``;
  cityinvested.innerHTML = ``;
  cityrewards.innerHTML = ``;
  incidents.innerHTML = ``;
  donationDIV.innerHTML = ``;
  greatbuilding.innerHTML = ``;
  gvg.innerHTML = ``;
  guild.innerHTML = ``;
  citystats.innerHTML = ``;
  visitstats.innerHTML = ``;
  visitstats.className = '';
  cultural.innerHTML = ``;
  cultural.className = '';
  if (metadataLoaded()) {
    startupService(msg);
  } else {
    setPendingStartupMsg(msg);
  }

  return true;
}
