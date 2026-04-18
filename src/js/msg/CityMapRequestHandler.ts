import { HandlerMessage } from './types';

type CityMapEntityState = {
  forge_points_for_level_up: number;
  invested_forge_points?: number;
  next_state_transition_at?: number;
};

type CityMapEntity = {
  type?: string;
  player_id?: number;
  id?: number;
  cityentity_id?: string;
  level?: number;
  max_level?: number;
  connected?: boolean;
  state?: CityMapEntityState;
};

type CityMapMessage = HandlerMessage & {
  responseData?: CityMapEntity[];
};

type CityMapDeps = {
  MyInfo: {
    id?: number;
    name?: string;
  };
  GBselected: {
    player?: number;
    id?: number;
    name?: string;
    era?: string;
    level?: number;
    max_level?: number;
    connected?: boolean;
    total?: number;
    current?: number;
  };
  helper: {
    fGBname: (name: string | undefined) => string;
    fGVGagesname: (era: string | undefined) => string;
  };
  setPlayerName: (name: string | undefined, id: number | undefined) => void;
  element: {
    close: () => string;
  };
  collapse: {
    collapseGBInfo?: boolean;
    fCollapseGBInfo: EventListener;
  };
  PlayerName: () => string;
  info: {
    innerHTML: string;
  };
  showOptions: {
    showGBInfo?: boolean;
  };
};

type GlobalJQuery = {
  $: (selector: string) => JQuery & { i18n(): void };
};

export function handleCityMapServiceRequest(
  msg: CityMapMessage,
  deps: CityMapDeps,
): boolean {
  if (!msg || msg.requestClass !== 'CityMapService') {
    return false;
  }

  const {
    MyInfo,
    GBselected,
    helper,
    setPlayerName,
    element,
    collapse,
    PlayerName,
    info,
    showOptions,
  } = deps;

  if (msg.requestMethod === 'getEntities') {
    if (msg.responseData?.length) {
      for (let j = 0; j < msg.responseData.length; j++) {
        if (msg.responseData[j].player_id === MyInfo.id) {
          // no-op
        }
      }
    }
    return true;
  }

  if (msg.requestMethod === 'updateEntity') {
    let outputHTML = '';
    let levelText = '';

    if (msg.responseData?.length) {
      console.debug('msg:', msg.responseData);
      console.debug(GBselected);
      for (let j = 0; j < msg.responseData.length; j++) {
        const selected = msg.responseData[j];
        if (selected.type === 'greatbuilding') {
          if (selected.player_id === MyInfo.id) {
            setPlayerName(MyInfo.name, MyInfo.id);
          }

          GBselected.player = selected.player_id;
          GBselected.id = selected.id;
          GBselected.name = helper.fGBname(selected.cityentity_id);
          const era = selected.cityentity_id?.split('_', 2);
          GBselected.era = helper.fGVGagesname(era?.[1]);
          GBselected.level = selected.level;
          GBselected.max_level = selected.max_level;
          GBselected.connected = selected.connected;
          GBselected.total = selected.state?.forge_points_for_level_up;
          if (selected.state?.invested_forge_points) {
            GBselected.current = selected.state.invested_forge_points;
          } else {
            GBselected.current = 0;
          }
          levelText += '<table>';
          levelText += `<tr><td colspan="2">Level ${GBselected.level} (Max ${
            GBselected.max_level
          })</td></tr><tr><td>${GBselected.current} of ${
            GBselected.total
          } FP <span data-i18n="total">total</span></td><td><span data-i18n="remaining">remaining</span>: ${
            (GBselected.total ?? 0) - (GBselected.current ?? 0)
          }FP</td></tr>`;
          const date = selected.state?.next_state_transition_at;
          if (date && date !== 2147483647) {
            const timer = new Date(date * 1000);
            levelText += `<tr><td colspan="2">Ready: ${timer.toLocaleString()}</td></tr>`;
          }
          levelText += '</table></div></div>';
        }
      }
      outputHTML = `<div class="alert alert-dark alert-dismissible show collapsed" href="#infoText" aria-expanded="true" aria-controls="infoText" data-bs-toggle="collapse" role="alert">${element.close()}<p id="infoTextLabel"><strong><span data-i18n="gb">GB</span> <span data-i18n="info">Info</span>:</strong> ${PlayerName()} | ${GBselected.name} [${GBselected.level}/${
        GBselected.max_level
      }]</p>`;
      outputHTML += `<div id="infoText" class="alert-dark collapse ${
        collapse.collapseGBInfo ? '' : 'show'
      }">`;
    }

    console.debug(GBselected);
    if (showOptions.showGBInfo && levelText) {
      info.innerHTML = outputHTML + levelText;
      document
        .getElementById('infoTextLabel')
        ?.addEventListener('click', collapse.fCollapseGBInfo);
      (globalThis as unknown as GlobalJQuery).$('body').i18n();
    }

    return true;
  }

  return false;
}
