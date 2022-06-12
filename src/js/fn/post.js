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
// FoE-Info API - demo SS
// https://script.google.com/macros/s/AKfycbw6QTefSBnuMF40Q8MpLcmCV8aB9dPNJnJzyjFBiZvBJaIlcE24JLkj/exec



// import $ from "jquery";
// import 'bootstrap';
// import Discord  from 'discord.js';
import { alerts, EpocTime, MyInfo, GameOrigin, url } from '../index.js';
import * as element from './AddElement';
import * as helper from './helper.js';
import { GBGdata } from '../msg/GuildBattlegroundService.js';


// Example POST method implementation:
async function postData(url = '', data = {}) {
	// Default options are marked with *
	const response = await fetch(url, {
		method: 'POST', // *GET, POST, PUT, DELETE, etc.
		mode: 'cors', // no-cors, *cors, same-origin
		cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'include', // include, *same-origin, omit
		headers: {
			'content-type': 'application/json'
			// "Access-Control-Allow-Origin": "*",
			// 'Content-Type': 'application/x-www-form-urlencoded',
		},
		redirect: 'follow', // manual, *follow, error
		referrerPolicy: 'strict-origin-when-cross-origin', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
		body: JSON.stringify(data) // body data type must match "Content-Type" header
	})
		.then(response => {
			console.debug(response); // JSON data parsed by `data.json()` call
			for (var item of response.headers.entries()) {
				console.debug(item);
			}
		});

	console.debug(response);
	return response.json(); // parses JSON response into native JavaScript objects
}



export function postToDiscord(text) {

	// test-test channel
	var webHookUrl = "https://discordapp.com/api/webhooks/976173827514060911/_ddYCMhIl7_MlZbGbLgsnHHLXIbAR4Fx_XywtjYToylqrWVva8L1-k89bZje20J5moij";

	const hook = getKey(webHookUrl);

	console.log(hook);


	/*
 * Create a new webhook
 * The Webhooks ID and token can be found in the URL, when you request that URL, or in the response body.
 * https://discord.com/api/webhooks/12345678910/T0kEn0fw3Bh00K
 *                                  ^^^^^^^^^^  ^^^^^^^^^^^^
 *                                  Webhook ID  Webhook Token
 */
	// const hook = new Discord.WebhookClient('687279023335800877', 'rtsthZ8GIxsD9LYhlluZHyqOQGQtZmOkaiNLKcAHRshWLPoUZqO1_XTuOObFeJqL4zyQ');
	// const client  = new Discord.Client();
	var selection = window.getSelection();
	selection.removeAllRanges();

	var oReq = new XMLHttpRequest();
	var params = {
		'username': MyInfo.name,
		'avatar_url': "",
		'content': text,
		// "embeds": [
		// 	{
		// 	  "author": {
		// 		"name": MyInfo.name,
		// 		// "url": "https://www.reddit.com/r/cats/",
		// 		// "icon_url": "https://i.imgur.com/R66g1Pe.jpg"
		// 	  },
		// 		}
		// 	  ],
		// 	  "footer": {
		// 		"text": "Woah! So cool! :smirk:",
		// 		"icon_url": "https://i.imgur.com/fKL31aD.jpg"
		// 	  }
		// 	}
		//   ]
	}
	// console.debug(params);
	//register method called after data has been sent method is executed
	// oReq.addEventListener("load", reqListener);
	oReq.open("POST", webHookUrl, true);
	// oReq.withCredentials = true;
	// oReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	// oReq.setRequestHeader("Access-Control-Allow-Origin", "*");
	oReq.setRequestHeader('Content-type', 'application/json');
	// oReq.send(JSON.stringify(myJSONStr));
	oReq.onreadystatechange = function () {
		// if (oReq.readyState == XMLHttpRequest.DONE) {
		// alert(oReq.responseText);
		console.debug(oReq.readyState, oReq.responseText);
		// }
		// $('#testModal').modal('show');
	}
	oReq.send(JSON.stringify(params));
	// oReq.send('I am now alive!');

	// const msg = new webhook.MessageBuilder()
	// .setName(MyInfo.name)
	// .setColor("#aabbcc")
	// .setText(text);

	// Send a slack message
	// webhook.sendSlackMessage({
	// 	'username': 'Wumpus',
	// 	'attachments': [{
	// 	'pretext': 'this looks pretty cool',
	// 	'color': '#F0F',
	// 	'footer_icon': 'http://snek.s3.amazonaws.com/topSnek.png',
	// 	'footer': 'Powered by sneks',
	// 	'ts': Date.now() / 1000
	// 	}]
	// }).catch(console.error);

	// hook.send('I am now alive!');
	// hook.send(JSON.stringify(params));

	// const embed = new Discord.MessageEmbed()
	// .setTitle('Some Title')
	// .setColor('#0099ff');

	// hook.send('Webhook test', {
	// username: 'some-username',
	// avatarURL: 'https://i.imgur.com/wSTFkRM.png',
	// embeds: [embed],
	// });

	// const data = { username: 'example' };

	// fetch('https://discordapp.com/api/webhooks/687279023335800877/rtsthZ8GIxsD9LYhlluZHyqOQGQtZmOkaiNLKcAHRshWLPoUZqO1_XTuOObFeJqL4zyQ', {
	//   method: 'POST', // or 'PUT'
	//   headers: {
	// 	'Content-Type': 'application/json',
	// 	"Access-Control-Allow-Origin": "*"
	//   },
	//   body: JSON.stringify(data),
	// })
	// .then(response => response.json())
	// .then(data => {
	//   console.debug('Success:', data);
	// })
	// .catch((error) => {
	//   console.error('Error:', error);
	// });

	var reqText = {
		"content": "Welcome to <:discohook:735474274458140705>Discohook, a free message and embed builder for Discord!\nThere's additional info in the embeds below, or you can use the *Clear all* button in the editor to start making embeds.\nHave questions? Discohook has a support server at <https://discohook.org/discord>.",
		"embeds": [
			{
				"title": "What's all this?",
				"description": "Discohook is a free tool that allows you to build Discord messages and embeds for use in your server.\n\nDiscohook sends messages using *webhooks*, an API feature that allows third-party services to *blindly* send messages into text channels. While webhooks can send messages, they cannot respond to user interactions such as messages.",
				"color": 7506394
			},
			{
				"title": "Text formatting how-tos",
				"description": "There are a few basic styles you can take advantage of:\n*Italics*, by surrounding text in asterisks (\\*);\n**Bold**, by surrounding text in double asterisks (\\*\\*);\n__Underline__, by using double underscores (\\_\\_);\n~~Strikethrough~~, by using double tildes (\\~\\~);\n`Code`, by using backticks (\\`).",
				"color": 4437377,
				"fields": [
					{
						"name": "Advanced formatting",
						"value": "Beyond these basic styles, you can also start a blockquote with a right-pointing angle bracket (>):\n> Hello.\nOr mark sensitive content behind a spoiler using two vertical bars (\\||):\n||This is hidden until clicked||"
					},
					{
						"name": "Using server emoji",
						"value": "While default emoji work like you would expect them to, server emotes are a bit more complicated.\n\nTo send a server emoji with a webhook, you must use a specific formatting code to do so. To find it, send that emoji in your server, but put a backslash (\\\\) in front of it.\n\nFor example: sending `\\:my_emoji:` would send `<:my_emoji:12345>` into chat. If you copy the output into Discohook, the emoji will show up properly."
					},
					{
						"name": "Pinging users and roles, linking to channels",
						"value": "First of all, you must have enabled developer mode in Discord's settings. To do so, open Discord settings and navigate to Appearance. There will be a Developer Mode toggle under the Advanced section, which you must enable.\n\nHaving developer mode enabled, you can now right-click your target to copy their ID. Keep in mind that for users, you must right click their *avatar*, not the message.\n\nTo mention them, you have to use Discord's mention syntax:\n`<@!user_id>`, `<@&role_id>`, or `<#channel_id>`. If done correctly, they will appear as <@!143419667677970434> in the preview."
					}
				]
			},
			{
				"title": "Additional magic",
				"color": 16426522,
				"fields": [
					{
						"name": "Image galleries",
						"value": "With some special magic, you can have up to 4 images in a single embed. This feature is exclusive to webhooks, so don't expect to make it work on a traditional bot.\n\nAll you need is to give your embed a URL and click on the \"Edit images\" button inside any embed to get started."
					},
					{
						"name": "Backups",
						"value": "Not only can Discohook send messages, but Discohook can also save them for later use. For when your message wasn't quite right.\nFor convenience, backups also contain the webhook URL.\n\nBackups will not be sent to the Discohook, and will always be stored offline. If you clear your browsing data, your backups will be lost *forever*!\n\nIf you want to keep your backups somewhere else, you can export backups to get a saved copy. Do keep in mind that they also include the stored webhook URL, so don't share it with anyone you don't trust."
					}
				]
			},
			{
				"title": "Legal things",
				"description": "To make Discohook as helpful as it can be, we use some assets derived from Discord's application. Discohook has no affiliation with Discord in any way, shape, or form.\n\nThe source code to this app is [available on GitHub](https://github.com/discohook/discohook) licensed under the GNU Affero General Public License v3.0.\nIf you need to contact me, you can join the [support server](https://discohook.org/discord), or send an email to \"hello\" at discohook.org.",
				"color": 15746887
			}
		]
	};


	// postData(webHookUrl, reqText)
	// .then(data => {
	//   console.debug(data); // JSON data parsed by `data.json()` call
	// });


}

export function postTargetsToDiscord() {

	if (!document.getElementById("targetText")) return;
	// battlegrounds channel
	// Testing Webhook https://discord.com/api/webhooks/802491154448252939/6fjCqY1Nt6dOEXJJd7BiMa_FcigDyWXK5ffnmL7Dr-xjN1-Ghs3h7q72fwiVitLoNUYu

	var webHookUrl = url.discordTargetURL;

	if (DEV && webHookUrl == "")
		webHookUrl = "https://discordapp.com/api/webhooks/802491154448252939/6fjCqY1Nt6dOEXJJd7BiMa_FcigDyWXK5ffnmL7Dr-xjN1-Ghs3h7q72fwiVitLoNUYu";

	var selection = window.getSelection();
	selection.removeAllRanges();

	var oReq = new XMLHttpRequest();
	var params = {
		'username': MyInfo.name,
		'avatar_url': "",
		// 'content': document.getElementById("targetText").innerHTML.replace(/<br\s*\/?>/ig, "\n").replace(/(<([^>]+)>)/gi, "").replace(/[\w\W]+?\n+?/,"").replace(/\n.*$/, '')
		'content': document.getElementById("targetText").innerHTML.replace(/<br\s*\/?>/ig, "\n").replace(/(<([^>]+)>)/gi, "").replace(/\n.*$/, '') + "\n----------"
	};
	oReq.open("POST", webHookUrl, true);
	// oReq.withCredentials = true;
	oReq.setRequestHeader('Content-type', 'application/json');
	oReq.onreadystatechange = function () {
		console.debug(oReq.readyState, oReq.responseText);
	}
	oReq.send(JSON.stringify(params));
	console.debug(oReq, params, document.getElementById("targetText").innerHTML.replace(/<br\s*\/?>/ig, "\n").replace(/(<([^>]+)>)/gi, ""));
}


export function postGBGtoSS() {
	// console.debug(data[0]);
	var googleSheetAPI = url.sheetGuildURL;
	var copytext = document.getElementById("battlegroundText");

	var reqData = {
		'sheet': 'GBG',
		'epoc': EpocTime,
		'GBGdata': GBGdata
	};

	var oReq = new XMLHttpRequest();
	oReq.open("POST", googleSheetAPI, true);
	oReq.setRequestHeader('Content-type', 'application/json');
	oReq.setRequestHeader("Access-Control-Allow-Origin", "*");
	oReq.onreadystatechange = function () {
		if (oReq.readyState == XMLHttpRequest.DONE) {
			// alert(oReq.responseText);
			console.debug(GameOrigin, oReq.responseText);
		}
	}
	oReq.send(JSON.stringify(reqData));
	// oReq.send(reqData.toString);
	// console.debug(reqData,JSON.stringify(reqData));
}

export function postAlerttoDsicord() {
	var copytext = document.getElementById("alertText").textContent;
	postToDiscord(copytext);
}

export function logToDiscord(text) {
	var webHookUrl = "https://discordapp.com/api/webhooks/690589445145231410/XQehmPTFdg82ijxxXMXMeYDuIkCuKokSDOVLztN737J60NCJ6nN3qzBlMjIxMJG0N-jq";
	// log channel

	var selection = window.getSelection();
	selection.removeAllRanges();

	var oReq = new XMLHttpRequest();
	var params = {
		username: MyInfo.name,
		avatar_url: "",
		content: text,
	}
	// console.debug(params);
	//register method called after data has been sent method is executed
	// oReq.addEventListener("load", reqListener);
	oReq.open("POST", webHookUrl, true);
	// oReq.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	oReq.setRequestHeader('Content-type', 'application/json');
	// oReq.send(JSON.stringify(myJSONStr));
	oReq.send(JSON.stringify(params));
}

export function postPlayerToSS(visitData) {
	// console.debug(visitData);
	var googleSheetAPI = url.sheetGuildURL;

	alerts.innerHTML = `<div class="alert alert-danger alert-dismissible show " role="alert">
		${element.close()}
		<p id="alertText"><strong>Posting Guild Stats to SS ... </strong><br>${visitData[0].Name}</p></div>`;

	var reqData = {
		'sheet': 'Guild',
		'playerData': visitData,
		'user': MyInfo.name,
	};

	var oReq = new XMLHttpRequest();
	oReq.open("POST", googleSheetAPI, true);
	oReq.setRequestHeader('Content-type', 'application/json');
	oReq.setRequestHeader("Access-Control-Allow-Origin", "*");
	oReq.onreadystatechange = function () {
		if (oReq.readyState == XMLHttpRequest.DONE) {
			// alert(oReq.responseText);
			console.debug(oReq.responseText);
			try {
				alerts.innerHTML = `<div class="alert alert-danger alert-dismissible show " role="alert">
				${element.close()}
				<p id="alertText"><strong>Guild Stats: </strong><br>${JSON.parse(oReq.responseText).result}
				</p></div>`;
			}
			catch {
				alerts.innerHTML = oReq.responseText;
			}
			$(document).ready(function () {
				// show the alert
				setTimeout(function () {
					$(`.alertText`).alert('close');
				}, 60000);
			});
		}
	}
	oReq.send(JSON.stringify(reqData));
	// oReq.send(reqData.toString);
	console.debug(reqData, JSON.stringify(reqData));
}
