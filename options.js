 // Saves options to chrome.storage
function save_options() {
  var showOptions = [];
     showOptions.showIncidents = document.getElementById('Incidents').checked;
     showOptions.showGVG = document.getElementById('GvG').checked;
     showOptions.showStats = document.getElementById('Stats').checked;
     showOptions.showGBInfo = document.getElementById('GBInfo').checked;
     showOptions.showGBRewards = document.getElementById('GBRewards').checked;
     showOptions.showGBDonors = document.getElementById('GBDonors').checked;
     showOptions.showInvested = document.getElementById('Invested').checked;
     showOptions.showDonation = document.getElementById('Donation').checked;
     showOptions.showFriends = document.getElementById('Friends').checked;
     showOptions.showGuild = document.getElementById('Guild').checked;
     showOptions.showHood = document.getElementById('Hood').checked;
     showOptions.showBattleground = document.getElementById('Battleground').checked;
     showOptions.showExpedition = document.getElementById('Expedition').checked;
     showOptions.showTreasury = document.getElementById('Treasury').checked;
  //  console.log(showOptions);
     // var defaultArcBonus = document.getElementById('defaultArcBonus').value;
     setStorage(showOptions);
    //  chrome.storage.local.set({
    //   showOptions: showOptions
    // }, function() {
    //   // Update status to let user know options were saved.
      var status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(function() {
        status.textContent = '';
      }, 2000);
    //   console.log(showOptions);
    // });
    // chrome.storage.local.get(null, function(items) {
    //   console.log(items);
    // });		
      }
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  function restore_options() {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.local.get('showOptions', function(items) {
      const showOptions = items.showOptions;
      document.getElementById('Incidents').checked = showOptions.showIncidents;
      document.getElementById('GvG').checked = showOptions.showGVG;
      document.getElementById('Stats').checked = showOptions.showStats;
      document.getElementById('GBInfo').checked = showOptions.showGBInfo;
      document.getElementById('GBRewards').checked = showOptions.showGBRewards;
      document.getElementById('GBDonors').checked = showOptions.showGBDonors;
      document.getElementById('Invested').checked = showOptions.showInvested;
      document.getElementById('Donation').checked = showOptions.showDonation;
      document.getElementById('Friends').checked = showOptions.showFriends;
      document.getElementById('Guild').checked = showOptions.showGuild;
      document.getElementById('Hood').checked = showOptions.showHood;
      document.getElementById('Battleground').checked = showOptions.showBattleground;
      document.getElementById('Expedition').checked = showOptions.showExpedition;
      document.getElementById('Treasury').checked = showOptions.showTreasury;
  });
  }


  function setStorage(value){
    // console.log(value);
      chrome.storage.local.set({
        showOptions: {
          showIncidents: value.showIncidents,
          showGVG: value.showGVG,
          showGBInfo: value.showGBInfo,
          showGBRewards: value.showGBRewards,
          showGBDonors: value.showGBDonors,
          showInvested: value.showInvested,
          showDonation: value.showDonation,
          showFriends: value.showFriends,
          showGuild: value.showGuild,
          showHood: value.showHood,
          showStats: value.showStats,
          showBattleground : value.showBattleground,
          showExpedition : value.showExpedition,
          showTreasury : value.showTreasury
                }
      }, function() {
      // console.log(`Value is set to`, value);
      });
  
    // chrome.storage.local.get(null, function(items) {
      // console.log(items);
    // });		
  }
  
  
  document.addEventListener('DOMContentLoaded', restore_options);
  document.getElementById('save').addEventListener('click', save_options); 