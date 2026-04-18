import browser from 'webextension-polyfill';
import { HandlerMessage } from './types';

type RequestHeader = {
  name: string;
  value: string;
};

type RequestData = {
  request: {
    headers: RequestHeader[];
  };
};

type HtmlContainer = {
  innerHTML: string;
  className?: string;
};

type StartupMessage = HandlerMessage;

type StartupDeps = {
  setGameOrigin: (origin: string) => void;
  getGameOrigin: () => string;
  MyInfo: {
    guildPosition?: number;
  };
  receiveStorage: (data: Record<string, unknown>) => void;
  output: HtmlContainer;
  overview: HtmlContainer;
  cityinvested: HtmlContainer;
  cityrewards: HtmlContainer;
  incidents: HtmlContainer;
  donationDIV: HtmlContainer;
  greatbuilding: HtmlContainer;
  gvg: HtmlContainer;
  guild: HtmlContainer;
  citystats: HtmlContainer;
  visitstats: HtmlContainer;
  cultural: HtmlContainer;
  metadataLoaded: () => boolean;
  startupService: (msg: StartupMessage) => void;
  setPendingStartupMsg: (msg: StartupMessage) => void;
};

export function handleStartupServiceRequest(
  msg: StartupMessage,
  request: RequestData,
  deps: StartupDeps,
): boolean {
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

  const contentType = request.request.headers.find(
    (header) => header.name === ':authority',
  );
  if (contentType) {
    setGameOrigin(contentType.value.split('.')[0]);
  }
  console.debug('GameOrigin:', getGameOrigin());

  browser.storage.local.getBytesInUse(null).then((size: number) => {
    console.debug('getBytesInUse', size);
  });

  browser.storage.local.get(null).then((result: Record<string, unknown>) => {
    const key = getGameOrigin() + 'MyInfo';
    const myInfo = result[key] as { guildPosition?: number } | undefined;
    if (myInfo) {
      MyInfo.guildPosition = myInfo.guildPosition;
    } else {
      MyInfo.guildPosition = 0;
    }
    receiveStorage(result as Record<string, unknown>);
  });

  output.innerHTML = '';
  overview.innerHTML = '';
  cityinvested.innerHTML = '';
  cityrewards.innerHTML = '';
  incidents.innerHTML = '';
  donationDIV.innerHTML = '';
  greatbuilding.innerHTML = '';
  gvg.innerHTML = '';
  guild.innerHTML = '';
  citystats.innerHTML = '';
  visitstats.innerHTML = '';
  visitstats.className = '';
  cultural.innerHTML = '';
  cultural.className = '';
  if (metadataLoaded()) {
    startupService(msg);
  } else {
    setPendingStartupMsg(msg);
  }

  return true;
}
