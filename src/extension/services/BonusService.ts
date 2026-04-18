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

import { City, Galaxy, showGalaxy } from './StartupService';
import { checkDebug, Bonus } from '../index';
import { showOptions } from '../state/showOptions';
import * as collapse from '../core/collapse';
import * as element from '../core/AddElement';

export function getBonuses(msg: Record<string, unknown>) {
  console.debug('Info Erased');
  // console.debug(collapseOptions);
  City.ForgePoints = 0;
  City.Coins = 0;
  City.ArcBonus = 0;
  City.ChatBonus = 0;
  City.TrazUnits = 0;

  // TODO
  // add daily_strategypoint to city info (Daily FP)

  if (
    typeof (window as unknown as Record<string, unknown>).DEV !== 'undefined' &&
    (window as unknown as Record<string, unknown>).DEV &&
    checkDebug()
  ) {
    var beta = document.getElementById('beta');

    if (beta == null) {
      beta = document.createElement('div');
      document.getElementById('content')!.appendChild(beta);
      beta.id = 'beta';
    }

    const responseData = msg.responseData as Array<Record<string, unknown>>;
    if (responseData.length > 1 && responseData[2].value) {
      City.ForgePoints += responseData[2].value as number;
      beta.innerHTML = `${element.close()}<p><strong>Town Hall</strong> ${responseData[2].value}FP Total: ${
        City.ForgePoints
      }FP</p>`;
      beta.className = 'alert alert-dismissible alert-success';
    }
  }
}

export function getLimitedBonuses(msg: Record<string, unknown>) {
  const responseData = msg.responseData as Array<Record<string, unknown>>;
  if (showOptions && showOptions.showBonus && responseData.length) {
    var bonusHTML = '';
    var bonus = document.getElementById('bonus');
    console.debug(responseData);

    responseData.forEach((entry) => {
      if (!entry.amount) bonus!.innerHTML = ``;

      if (entry.type == 'spoils_of_war') {
        Bonus.spoils = entry.amount as number;
        if (document.getElementById('spoilsID'))
          document.getElementById('spoilsID')!.textContent = String(
            entry.amount,
          );
        if (entry.amount)
          bonusHTML += `Spoils <span id="spoilsID">${Bonus.spoils}</span> `;
      } else if (entry.type == 'diplomatic_gifts') {
        Bonus.diplomatic = entry.amount as number;
        if (document.getElementById('diplomaticID'))
          document.getElementById('diplomaticID')!.textContent = String(
            entry.amount,
          );
        if (entry.amount)
          bonusHTML += `Dip <span id="diplomaticID">${Bonus.diplomatic}</span> `;
      } else if (entry.type == 'first_strike') {
        Bonus.strike = entry.amount as number;
        if (document.getElementById('firststrikeID'))
          document.getElementById('firststrikeID')!.textContent = String(
            entry.amount,
          );
        if (entry.amount)
          bonusHTML += `Strike <span id="firststrikeID">${Bonus.strike}</span> `;
      } else if (entry.type == 'aid_goods') {
        Bonus.aid = entry.amount as number;
        if (document.getElementById('aidID'))
          document.getElementById('aidID')!.textContent = String(entry.amount);
        if (entry.amount)
          bonusHTML += `Aid <span id="aidID">${Bonus.aid}</span> `;
      } else if (entry.type == 'double_collection') {
        Galaxy.amount =
          (entry.amount as number) > 0 ? (entry.amount as number) : 0;
        showGalaxy();
      } else if (
        entry.type == 'daily_strategypoint' ||
        entry.__class__ == 'DailyStrategyPointBonus'
      ) {
        const fp = (entry.value ?? entry.amount ?? 0) as number;
        City.ForgePoints += fp;
        const fpSpan = document.getElementById('fp');
        if (fpSpan)
          fpSpan.innerHTML = `<span data-i18n="daily">Daily</span>: ${City.ForgePoints}FP`;
      }
    });
    if (
      bonus!.innerHTML == `` &&
      (Bonus.aid || Bonus.spoils || Bonus.diplomatic || Bonus.strike)
    ) {
      bonus!.innerHTML = `<div id="bonusTip" class="alert alert-light alert-dismissible" role="alert">
            <p id="bonusTextLabel" href="#bonusText" data-bs-toggle="collapse">
      ${element.icon('bonusicon', 'bonusText', collapse.collapseBonus)}
			<strong><span data-i18n="bonus">Bonus</span>:</strong> ${bonusHTML}</p>
            ${element.close()}
            <div id="bonusText" class="alert-light collapse"><p><strong>Legend:</strong><br>First <em>Strike</em> - Kraken<br><em>Spoils</em> of War - Himeji Castle<br><em>Dip</em>lomatic Gifts - Space Carrier<br><em>Aid</em> Goods - Truce Tower</p></div></div>`;
      document
        .getElementById('bonusicon')!
        .addEventListener('click', collapse.fCollapseBonus);
      document
        .getElementById('bonusTextLabel')!
        .addEventListener('click', collapse.fCollapseBonus);
    } else if (
      !(Bonus.aid || Bonus.spoils || Bonus.diplomatic || Bonus.strike)
    ) {
      bonus!.innerHTML = ``;
    }
  }
}
