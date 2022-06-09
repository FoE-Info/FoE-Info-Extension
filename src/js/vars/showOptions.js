	export var showFriends = true;
	export var showGuild = true;
	export var showHood = true;
	export var showBonus = true;
	export var showIncidents  = true;
	export var showGVG  = true;
	export var showStats  = true;
	export var showGBInfo  = false;
	export var showGBRewards  = true;
	export var showGBDonors  = true;
	export var showInvested  = true;
	export var showDonation  = true;
	export var showBattleground  = true;
	export var showBattlegroundChanges  = false;
	export var showExpedition  = true;
	export var showTreasury  = true;
	export var showVisit =true;
	export var showSettlement = true;
	export var showArmy = true;
	export var showGoods = false;
	export var showLeaderboard = false;
	export var showGBGrewards = true;
	export var GBGprovinceTime = true;
	export var GBGshowSC = true;
	export var showGErewards = true;
	export var showRewards = true;
	export var showLogs = false;
	export var showContributions = false;
	export var showGuildPosition  = false;
	export var hideUnsafe  = true;
	export var buildingCosts  = false;
	export var collectionTimes  = false
	export var clipboard = true;

	export default function set (name, state) {
		console.debug(name,state);
		// console.debug(this,this[name]);
		// if(name == 'showOptions'){

			Object.entries(state).forEach(entry => {
				const [key, value] = entry;
				// console.debug(key, value);
				items[key] = value;
			  });

				console.debug(items);
		// }
	}

	var items = {
		showFriends,
		showGuild,
		showHood,
		showBonus,
		showIncidents ,
		showGVG ,
		showStats ,
		showGBInfo ,
		showGBRewards ,
		showGBDonors ,
		showInvested ,
		showDonation ,
		showBattleground ,
		showBattlegroundChanges ,
		showExpedition ,
		showTreasury ,
		showVisit ,
		showSettlement,
		showArmy,
		showGoods,
		showLeaderboard,
		showGBGrewards,
		GBGprovinceTime,
		GBGshowSC,
		showGErewards,
		showRewards,
		showLogs,
		showContributions,
		showGuildPosition ,
		hideUnsafe ,
		buildingCosts ,
		collectionTimes,
		clipboard
	}

	export {items as showOptions}
