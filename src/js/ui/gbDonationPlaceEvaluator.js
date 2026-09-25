/**
 * gbDonationPlaceEvaluator.js
 *
 * Evaluates Great Building donation places (1st-5th), calculating lock values,
 * profit/loss outcomes, friendly donation badges, and suggested donation snippets.
 * Extracted from renderGbDonationPanel.js to preserve modular line-count budgets.
 */

function evaluateGbDonationPlaces(options = {}) {
  const {
    GBselected = {},
    Top = [0, 0, 0, 0, 0, 0],
    GBrewards = [0, 0, 0, 0, 0],
    currentPercent = 190,
    City = {},
    PlayerName = '',
    MyInfo = {},
    isGbLocked = false,
    showOptions = {},
    depTables = {},
    calcPlaceValues = () => ({}),
    isPlacePassableFn = () => false,
    getSafe = () => ({ safe: [], donateSuggest: [] }),
    getFriendlyDonation = () => '',
    getDonations = () => '',
    ownerSafeAddFn = () => 0,
    BN,
  } = options;

  const gbTabSafe = depTables.gbTabSafe || (() => '');
  const gbTabNotSafe = depTables.gbTabNotSafe || (() => '');
  const gbTabEmpty = depTables.gbTabEmpty || (() => '');

  let foundPlace = false;
  let remaining;
  let Donation = BN ? new BN(0) : 0;
  let RewardFP = BN ? new BN(0) : 0;
  let Profit = 0;
  let Percent = BN ? new BN(0) : 0;
  let donateCustom = BN ? new BN(0) : 0;
  let safeArr;
  let donateSuggestArr = [];

  let olddonationHTML = '';
  let newdonationHTML = '';
  let copyText = '';

  for (let p = 1; p <= 5; p++) {
    remaining = Math.max(
      0,
      (GBselected.total || 0) - (GBselected.current || 0),
    );

    const vals = calcPlaceValues(
      GBselected,
      p,
      Top,
      GBrewards,
      currentPercent,
      City?.ArcBonus ?? 90,
    );
    remaining = vals.remaining ?? remaining;
    Donation = vals.donation ?? Donation;
    RewardFP = vals.rewardFP ?? RewardFP;
    Profit = vals.profit ?? Profit;
    Percent = vals.percent ?? Percent;
    donateCustom = vals.donateCustom ?? donateCustom;

    const safeRes = getSafe({
      place: p,
      GBrewards,
      currentPercent,
      remaining,
      Top,
    });
    safeArr = safeRes.safe || [];
    donateSuggestArr = safeRes.donateSuggest || [];
    const placeIdx = p - 1;

    const canBePassed = isPlacePassableFn(remaining, Top[placeIdx] || 0);

    if (canBePassed) {
      foundPlace = true;
      const placeOrdinal =
        p === 1 ? '1st'
        : p === 2 ? '2nd'
        : p === 3 ? '3rd'
        : `${p}th`;

      const outcome = vals.outcome || (Profit > 0 ? 'profit' : 'loss');
      const netValue = Math.abs(vals.profitNum ?? 0);
      const outcomeClass = outcome === 'loss' ? 'invest-bad' : 'invest-good';

      if (outcome === 'loss') {
        olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br><span data-i18n="loss">Loss</span>: ${netValue}<br>`;
        newdonationHTML += gbTabNotSafe(
          p,
          currentPercent,
          Donation,
          RewardFP,
          donateCustom,
          donateSuggestArr,
          GBrewards,
          GBselected.connected,
          isGbLocked,
          safeArr,
        );
      } else {
        const outcomeLine =
          outcome === 'safe' ?
            `<span data-i18n="safe_net">Safe</span>: 0 NET`
          : `<span data-i18n="profit">Profit</span>: ${netValue} (${Percent}%)`;
        olddonationHTML += `<p class="${outcomeClass}">${placeOrdinal} Place<br><span data-i18n="lock">Lock</span>: ${Donation}FP<br>${outcomeLine}<br>`;
        newdonationHTML += gbTabSafe(
          p,
          currentPercent,
          Donation,
          RewardFP,
          donateCustom,
          donateSuggestArr,
          GBrewards,
          GBselected.connected,
          isGbLocked,
          safeArr,
        );
      }

      if (GBrewards[placeIdx]) {
        olddonationHTML += getFriendlyDonation(
          donateCustom,
          RewardFP,
          currentPercent,
          Donation,
          vals.band,
        );
        olddonationHTML +=
          p === 1 ? `BE: ${RewardFP}FP</p>` : `BE: ${RewardFP}FP<br></p>`;

        const ownerAdd = ownerSafeAddFn(
          remaining,
          Top[placeIdx] || 0,
          donateCustom,
        );

        if (PlayerName === MyInfo.name && ownerAdd > 0) {
          olddonationHTML += `<p class=""><span data-i18n="add">Add</span> ${ownerAdd}FP <span data-i18n="safe">to make safe for</span> ${
            currentPercent ? currentPercent / 100 : '1.9'
          }</p>`;
        }
        copyText += getDonations({
          place: p,
          safe: safeArr,
          donateSuggest: donateSuggestArr,
          showOptions,
        });
      } else {
        olddonationHTML += '</p>';
        if (p === 1) {
          copyText += getDonations({
            place: 1,
            safe: safeArr,
            donateSuggest: donateSuggestArr,
            showOptions,
          });
        }
      }
      break;
    }
  }

  if (!foundPlace) {
    copyText = '';
    newdonationHTML += gbTabEmpty(
      '-',
      currentPercent,
      Donation,
      RewardFP,
      donateCustom,
      donateSuggestArr,
      GBrewards,
      GBselected.connected,
      isGbLocked,
    );
  }

  return {
    foundPlace,
    olddonationHTML,
    newdonationHTML,
    copyText,
  };
}

module.exports = {
  evaluateGbDonationPlaces,
};
module.exports.default = evaluateGbDonationPlaces;
module.exports.evaluateGbDonationPlaces = evaluateGbDonationPlaces;
