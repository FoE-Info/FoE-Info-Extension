type ClanServiceMember = {
  rank: number;
  name: string;
  title?: string;
  player_id?: number;
  era?: string;
  won_battles?: number;
  score?: number;
  is_self?: boolean;
};

type ClanServiceLogEntry = {
  resource: string;
  player: {
    name: string;
  };
  action: string;
  amount: number;
  createdAt: string;
};

type ClanServiceResourceDef = {
  id: string;
  era: string;
  name: string;
};

type ClanServiceResponseData = {
  members?: ClanServiceMember[];
  name?: string;
  membersNum?: number;
  logs?: ClanServiceLogEntry[];
  resources?: Record<string, number>;
  length?: number;
};

type GuildDonationRow = Array<string | number>;
type GuildTreasuryRow = Array<string | number>;

function addNumericValue(
  row: Array<string | number>,
  index: number,
  amount: number,
) {
  row[index] = Number(row[index] ?? 0) + amount;
}

type ClanServiceMessage = {
  requestClass?: string;
  requestMethod?: string;
  responseData: ClanServiceResponseData;
};

type ClanServiceDeps = {
  showOptions: {
    showTreasury?: boolean;
    showGuild?: boolean;
    showContributions?: boolean;
    showLogs?: boolean;
  };
  element: {
    icon: (iconId: string, targetId: string, collapsed?: boolean) => string;
    close: () => string;
    copy: (
      elementId: string,
      color: string,
      placement: string,
      collapsed?: boolean,
    ) => string;
  };
  collapse: {
    collapseFriends?: boolean;
    fCollapseFriends: EventListener;
    collapseTreasuryLog?: boolean;
    collapseTreasury?: boolean;
    fCollapseTreasury: EventListener;
  };
  helper: {
    fGVGagesname: (era?: string) => string;
    fResourceShortName: (resource: string) => string;
    fLevelfromAge: (era: string) => number;
    numAges: number;
    fAgefromLevel: (level: number) => string;
  };
  copy: {
    fFriendsCopy: EventListener;
    TreasuryCopy: EventListener;
  };
  friendsDiv: { innerHTML: string };
  MyInfo: { guild?: string };
  setMyGuildPosition: (rank: number) => void;
  GuildDonations: GuildDonationRow[];
  GuildTreasury: GuildTreasuryRow[];
  ResourceDefs: ClanServiceResourceDef[];
  treasuryLog: { innerHTML: string };
  treasury: { innerHTML: string };
  cityinvested: { innerHTML: string };
  output: { innerHTML: string };
  overview: { innerHTML: string };
  alerts: { innerHTML: string };
  donationDIV: { innerHTML: string };
  incidents: { innerHTML: string };
  donation2DIV: { innerHTML: string };
  donationDIV2: { innerHTML: string };
  greatbuilding: { innerHTML: string };
  guild: { innerHTML: string };
  debug: { innerHTML: string };
  info: { innerHTML: string };
  visitstats: { innerHTML: string; className: string };
  cultural: { innerHTML: string; className: string };
  gvg: { innerHTML: string; className: string };
  gvgSummary?: { innerHTML: string };
  gvgAges?: { innerHTML: string };
  toolOptions: { treasurySize: number };
  initTreasury: (resources: Record<string, number>) => void;
  setTreasurySize: (height: number) => void;
};

export function handleClanServiceRequest(
  msg: ClanServiceMessage,
  deps: ClanServiceDeps,
) {
  if (!msg || msg.requestClass !== 'ClanService') {
    return false;
  }

  const {
    showOptions,
    element,
    collapse,
    helper,
    copy,
    friendsDiv,
    MyInfo,
    setMyGuildPosition,
    GuildDonations,
    GuildTreasury,
    ResourceDefs,
    treasuryLog,
    treasury,
    cityinvested,
    output,
    overview,
    alerts,
    donationDIV,
    incidents,
    donation2DIV,
    donationDIV2,
    greatbuilding,
    guild,
    debug,
    info,
    visitstats,
    cultural,
    gvg,
    gvgSummary,
    gvgAges,
    toolOptions,
    initTreasury,
    setTreasurySize,
  } = deps;

  if (
    msg.requestMethod == 'getOwnClanData' ||
    msg.requestMethod == 'getClanData'
  ) {
    if (showOptions.showTreasury && msg.requestMethod == 'getOwnClanData') {
      const members = msg.responseData.members ?? [];
      GuildDonations.push([
        msg.responseData.name ?? '',
        msg.responseData.membersNum ?? 0,
      ]);
      members.forEach((entry: ClanServiceMember) => {
        GuildDonations.push([
          entry.rank,
          entry.name,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
        ]);

        if (entry.is_self == true) {
          setMyGuildPosition(entry.rank);
        }
      });
      ($('body') as JQuery & { i18n(): void }).i18n();
    }

    if (showOptions.showGuild && msg.responseData.members) {
      var guildlist = msg.responseData.members;
      var friendsHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert"><p id="friendsTextLabel" href="#friendsText" data-bs-toggle="collapse">
		${element.icon('friendsicon', 'friendsText', collapse.collapseFriends)}<strong>Guild Members</strong></p>
		${element.close()}<div id="friendsCopy">
		${element.copy('friendsCopyID', 'success', 'right', collapse.collapseFriends)}</div>`;
      friendsHTML += `<div id="friendsText" class="overflow-y collapse ${
        collapse.collapseFriends ? '' : 'show'
      }">
	  <table id="friendsText2"><tr><th>Name</th><th>Title</th><th>ID</th><th>Era</th><th>Battles</th><th>Score</th></tr>`;
      guildlist.forEach((entry: ClanServiceMember) => {
        friendsHTML += `<tr><td>${entry.name}</td><td>${entry.title}</td><td>${
          entry.player_id
        }</td><td>${helper.fGVGagesname(entry.era)}</td><td>${entry.won_battles}</td><td>${
          entry.score
        }</td></tr>`;
      });
      friendsDiv.innerHTML = friendsHTML + `</table></div></div>`;
      if (collapse.collapseFriends == false) {
        document
          .getElementById('friendsCopyID')!
          .addEventListener('click', copy.fFriendsCopy);
      }
      document
        .getElementById('friendsTextLabel')!
        .addEventListener('click', collapse.fCollapseFriends);
      ($('body') as JQuery & { i18n(): void }).i18n();
    }

    return true;
  }

  if (msg.requestMethod == 'getTreasuryLogs') {
    if (showOptions.showContributions || showOptions.showLogs) {
      let treasuryHTML = '';
      if (showOptions.showLogs) {
        treasuryHTML = treasuryLog.innerHTML;
        if (!treasuryHTML) {
          treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
							${element.close()}
							<p href="#treasuryLogText" aria-expanded="true" aria-controls="treasuryLogText" data-bs-toggle="collapse">
              ${element.icon('treasuryLogicon', 'treasuryLogText', collapse.collapseTreasuryLog)}
                    <strong>Treasury Logs:</strong></p>`;
          treasuryHTML += `<table id="treasuryLogText" class="overflow collapse show">`;
        } else {
          treasuryHTML = treasuryHTML.substring(0, treasuryHTML.length - 8);
        }
      }

      const logs = msg.responseData.logs ?? [];
      logs.forEach((entry: ClanServiceLogEntry) => {
        if (entry.resource == 'medals') {
          GuildDonations.forEach((member: GuildDonationRow) => {
            if (member[1] == entry.player.name) {
              if (
                entry.action.toLowerCase() == 'guild continent: slot unlocked'
              )
                addNumericValue(member, 2, entry.amount);
              else if (entry.action.toLowerCase() == 'siege army deployment')
                addNumericValue(member, 2, entry.amount);
              else if (
                entry.action.toLowerCase() == 'guild continent: grant freedom'
              )
                addNumericValue(member, 3, entry.amount);
              else if (entry.action.toLowerCase() == 'donation')
                addNumericValue(member, 4, entry.amount);
            }
          });
        } else {
          GuildDonations.forEach((member: GuildDonationRow) => {
            if (member[1] == entry.player.name) {
              if (
                entry.action.toLowerCase() == 'siege army deployment' ||
                entry.action.toLowerCase() == 'guild continent: slot unlocked'
              )
                addNumericValue(member, 5, entry.amount);
              else if (
                entry.action.toLowerCase() == 'guild continent: grant freedom'
              )
                addNumericValue(member, 6, entry.amount);
              else if (
                entry.action.toLowerCase() == 'battlegrounds: place building'
              )
                addNumericValue(member, 7, entry.amount);
              else if (
                entry.action.toLowerCase() ==
                'guild expedition: difficulty unlocked'
              )
                addNumericValue(member, 8, entry.amount);
              else if (entry.action.toLowerCase() == 'building production')
                addNumericValue(member, 9, entry.amount);
              else if (
                entry.action.toLowerCase() == 'guild treasury donation'
              ) {
                addNumericValue(member, 11, entry.amount);
              } else {
                console.debug(entry.action, entry.amount);
              }

              if (entry.action.toLowerCase() == 'guild treasury donation') {
                ResourceDefs.forEach((rssDef: ClanServiceResourceDef) => {
                  if (rssDef.id == entry.resource) {
                    addNumericValue(
                      member,
                      31 - helper.fLevelfromAge(rssDef.era),
                      entry.amount,
                    );
                  }
                });
              }
            }
          });

          GuildTreasury.forEach((rss: GuildTreasuryRow) => {
            if (entry.resource == rss[0]) {
              if (
                entry.action.toLowerCase() == 'siege army deployment' ||
                entry.action.toLowerCase() ==
                  'guild continent: slot unlocked' ||
                entry.action.toLowerCase() == 'guild continent: grant freedom'
              ) {
                addNumericValue(rss, 6, entry.amount);
              } else if (
                entry.action.toLowerCase() == 'battlegrounds: place building'
              ) {
                addNumericValue(rss, 7, entry.amount);
              } else if (
                entry.action.toLowerCase() ==
                'guild expedition: difficulty unlocked'
              ) {
                addNumericValue(rss, 5, entry.amount);
              } else if (
                entry.action.toLowerCase() == 'building production' ||
                entry.action.toLowerCase() == 'guild treasury donation'
              ) {
                addNumericValue(rss, 4, entry.amount);
              }
              addNumericValue(rss, 8, entry.amount);
              return;
            }
          });
        }

        if (showOptions.showLogs)
          treasuryHTML += `<tr><td>${entry.player.name}</td><td>${helper.fResourceShortName(
            entry.resource,
          )}</td><td>${entry.action}</td><td>${entry.amount}</td><td>${
            entry.createdAt
          }</td></tr>`;
      });

      if (showOptions.showLogs)
        treasuryLog.innerHTML = treasuryHTML + `</table>`;

      if (showOptions.showContributions) {
        treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" data-bs-toggle="collapse" role="alert">`;
        treasuryHTML += element.close();
        treasuryHTML += element.copy(
          'treasuryCopyID',
          'success',
          'right',
          collapse.collapseTreasury,
        );
        treasuryHTML += `<p id="treasuryTextLabel" href="#treasuryText" data-bs-toggle="collapse">`;
        treasuryHTML += element.icon(
          'treasuryicon',
          'treasuryText',
          collapse.collapseTreasury,
        );
        treasuryHTML += `<strong>Treasury Contributions:</strong></p>`;
        treasuryHTML += `<div id="treasuryText" class="collapse ${
          collapse.collapseTreasury ? '' : 'show'
        }">
			<table id="treasurytable" class="overflow table collapse show"><tr><th>Name</th><th>Medals Spent</th><th>Medals Returned</th><th>Medals Donated</th><th>Medals Total</th><th>Goods Spent GVG</th><th>Goods Returned GVG</th><th>Goods Spent GBG</th><th>Goods Spent GE</th><th>Goods Donated Building</th><th>Goods Donated ???</th><th>Goods Donated</th><th>SAV</th><th>SAAB</th><th>SAM</th><th>VF</th><th>OF</th><th>AF</th><th>FE</th><th>TE</th><th>CE</th><th>PME</th><th>ME</th><th>PE</th><th>InA</th><th>CA</th><th>LMA</th><th>HMA</th><th>EMA</th><th>IA</th></tr>`;
        GuildDonations.forEach((member: GuildDonationRow) => {
          if (member[0] != MyInfo.guild)
            treasuryHTML += `<tr><td>${member[1]}</td><td>${member[2]}</td><td>${
              member[3]
            }</td><td>${member[4]}</td><td>${Number(member[2]) + Number(member[3]) + Number(member[4])}</td><td>${
              member[5]
            }</td><td>${member[6]}</td><td>${member[7]}</td><td>${member[8]}</td><td>${
              member[9]
            }</td><td>${member[10]}</td><td>${member[11]}</td><td>${member[12]}</td><td>${
              member[13]
            }</td><td>${member[14]}</td><td>${member[15]}</td><td>${member[16]}</td><td>${
              member[17]
            }</td><td>${member[18]}</td><td>${member[19]}</td><td>${member[20]}</td><td>${
              member[21]
            }</td><td>${member[22]}</td><td>${member[23]}</td><td>${member[24]}</td><td>${
              member[25]
            }</td><td>${member[26]}</td><td>${member[27]}</td><td>${member[28]}</td><td>${
              member[29]
            }</td></tr>`;
        });

        if (GuildTreasury) {
          treasuryHTML += `<tr></tr>`;
          treasuryHTML += `<tr><th>Era:Resource</th><th>Treasury</th><th>Donations</th><th>GE Cost</th><th>GVG Cost</th><th>GBG Cost</th><th>Net Change</th></tr>`;
          GuildTreasury.forEach((rss: GuildTreasuryRow) => {
            treasuryHTML += `<tr><td>${rss[1]}:${rss[2]}</td><td>${rss[3]}</td><td>${rss[4]}</td><td>${rss[5]}</td><td>${rss[6]}</td><td>${rss[7]}</td><td>${rss[8]}</td></tr>`;
          });
        }

        treasury.innerHTML = treasuryHTML + `</table></div>`;
        document
          .getElementById('treasuryCopyID')!
          .addEventListener('click', copy.TreasuryCopy);
        document
          .getElementById('treasuryTextLabel')!
          .addEventListener('click', collapse.fCollapseTreasury);
      }
      ($('body') as JQuery & { i18n(): void }).i18n();
    } else {
      console.debug(msg.responseData.length);
    }

    return true;
  }

  if (msg.requestMethod == 'getTreasury') {
    cityinvested.innerHTML = ``;
    output.innerHTML = ``;
    overview.innerHTML = ``;
    alerts.innerHTML = ``;
    donationDIV.innerHTML = ``;
    incidents.innerHTML = ``;
    donation2DIV.innerHTML = ``;
    donationDIV2.innerHTML = ``;
    greatbuilding.innerHTML = ``;
    guild.innerHTML = ``;
    debug.innerHTML = ``;
    info.innerHTML = ``;
    donationDIV.innerHTML = ``;
    visitstats.innerHTML = ``;
    visitstats.className = '';
    cultural.innerHTML = ``;
    cultural.className = '';
    friendsDiv.innerHTML = '';
    gvg.innerHTML = ``;
    gvg.className = '';
    if (gvgSummary) gvgSummary.innerHTML = '';
    if (gvgAges) gvgAges.innerHTML = '';

    if (showOptions.showTreasury) {
      let treasuryHTML = '';

      treasuryHTML = `<div class="alert alert-success alert-dismissible show collapsed" role="alert">
	${element.close()}<p id="treasuryTextLabel" href="#treasuryText" data-bs-toggle="collapse">`;
      treasuryHTML += element.icon(
        'treasuryicon',
        'treasuryText',
        collapse.collapseTreasury,
      );
      treasuryHTML += `<strong>Guild Treasury:</strong></p>`;
      treasuryHTML += element.copy(
        'treasuryCopyID',
        'success',
        'right',
        collapse.collapseTreasury,
      );
      treasuryHTML += `<div id="treasuryText" style="height: ${
        toolOptions.treasurySize
      }px" class="overflow collapse ${
        collapse.collapseTreasury ? '' : 'show'
      }"><table id="treasurytable">`;

      const resources = msg.responseData.resources ?? {};
      initTreasury(resources);

      for (var i = 0; i < helper.numAges; i++) {
        ResourceDefs.forEach((rssDef: ClanServiceResourceDef) => {
          if (
            rssDef.era == helper.fAgefromLevel(helper.numAges - i) &&
            resources[rssDef.id]
          ) {
            treasuryHTML += `<tr><td>${helper.fGVGagesname(rssDef.era)}:${
              rssDef.name
            }</td><td>${resources[rssDef.id]}</td></tr>`;
          }
        });
      }
      treasuryHTML += `<tr><td>Medals</td><td>${resources['medals']}</td></tr>`;

      treasury.innerHTML = treasuryHTML + `</table></div>`;
      document
        .getElementById('treasuryCopyID')!
        .addEventListener('click', copy.TreasuryCopy);
      console.debug('GuildTreasury', GuildTreasury);
      document
        .getElementById('treasuryTextLabel')!
        .addEventListener('click', collapse.fCollapseTreasury);
      const treasuryDiv = document.getElementById('treasuryText');
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height)
            setTreasurySize(entry.contentRect.height);
        }
      });
      resizeObserver.observe(treasuryDiv!);
      ($('body') as JQuery & { i18n(): void }).i18n();
    } else {
      console.debug(msg.responseData.length);
    }

    return true;
  }

  return false;
}
