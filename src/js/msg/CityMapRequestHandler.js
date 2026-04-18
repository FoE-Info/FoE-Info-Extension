export function handleCityMapServiceRequest(msg, deps) {
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

  if (msg.requestMethod == 'getEntities') {
    if (msg.responseData.length) {
      for (var j = 0; j < msg.responseData.length; j++) {
        if (msg.responseData[j].player_id == MyInfo.id) {
          // no-op
        }
      }
    }
    return true;
  }

  if (msg.requestMethod == 'updateEntity') {
    var outputHTML = '';
    var levelText = '';

    if (msg.responseData.length) {
      console.debug('msg:', msg.responseData);
      console.debug(GBselected);
      for (var j = 0; j < msg.responseData.length; j++) {
        const selected = msg.responseData[j];
        if (selected.type == 'greatbuilding') {
          if (selected.player_id == MyInfo.id) {
            setPlayerName(MyInfo.name, MyInfo.id);
          }

          GBselected.player = selected.player_id;
          GBselected.id = selected.id;
          GBselected.name = helper.fGBname(selected.cityentity_id);
          var era = selected.cityentity_id.split('_', 2);
          GBselected.era = helper.fGVGagesname(era[1]);
          GBselected.level = selected.level;
          GBselected.max_level = selected.max_level;
          GBselected.connected = selected.connected;
          GBselected.total = selected.state.forge_points_for_level_up;
          if (selected.state.invested_forge_points)
            GBselected.current = selected.state.invested_forge_points;
          else GBselected.current = 0;
          levelText += `<table>`;
          levelText += `<tr><td colspan="2">Level ${GBselected.level} (Max ${
            GBselected.max_level
          })</td></tr><tr><td>${GBselected.current} of ${
            GBselected.total
          } FP <span data-i18n="total">total</span></td><td><span data-i18n="remaining">remaining</span>: ${
            GBselected.total - GBselected.current
          }FP</td></tr>`;
          var date = selected.state.next_state_transition_at;
          if (date && date != 2147483647) {
            var timer = new Date(date * 1000);
            levelText += `<tr><td colspan="2">Ready: ${timer.toLocaleString()}</td></tr>`;
          }
          levelText += `</table></div></div>`;
        }
      }
      outputHTML = `<div class="alert alert-dark alert-dismissible show collapsed" href="#infoText" aria-expanded="true" aria-controls="infoText" data-bs-toggle="collapse" role="alert">${element.close()}<p id="infoTextLabel"><strong><span data-i18n="gb">GB</span> <span data-i18n="info">Info</span>:</strong> ${
        PlayerName()
      } | ${GBselected.name} [${GBselected.level}/${
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
        .addEventListener('click', collapse.fCollapseGBInfo);
      $('body').i18n();
    }

    return true;
  }

  return false;
}
