String.prototype.clr = function (hexColor) { return `<font color="#${hexColor}">${this}</font>` };
const config = require('./config.json');
const Vec3 = require('tera-vec3');
const mapID = [9783, 9983];
const HuntingZn = [783, 983];
const BossID = [1000, 2000, 3000];

const FirstBossActions = {
	108: {msg: '后跳(眩晕)'},
	109: {msg: '后扫(击退)'},
	119: {msg: '蓄力捶地'},

	127: {msg: '雷电!!'}
};
const SecondBossActions = {
//	105: {msg: '皮鞭(击飞)'},
	110: {msg: '前砸(闪避)'},

	111: {msg: '右后踢(击退)'},
	115: {msg: '左后踢(击退)'},

	119: {msg: '跳跃(眩晕)'},

	120: {msg: '前拳+后踢(击退)'},

	316: {msg: '火焰(爆炸)'},
	317: {msg: '水波(击飞)'},
	318: {msg: '地毯(眩晕)'}
};
const ThirdBossActions = {
	106: {msg: '前推(击退)'},

	109: {msg: '前插(眩晕)'},

	112: {msg: '后扫(击退)'},

	301: {msg: '地刺(击飞)'},

	303: {msg: '→→→→右', sign_degrees: 80, sign_distance: 250},
	306: {msg: '左←←←←', sign_degrees: 280, sign_distance: 250},

	309: {msg: '注视!!'},

	315: {msg: '恐惧(吸血)'}
};

module.exports = function ccGuide(d) {
	let	enabled = config.enabled,
		sendToParty = config.sendToParty,
		streamenabled = config.streamenabled,
		msgcolour = config.msgcolour,

		isTank = false,
		insidemap = false,
		insidezone = false,
		whichmode = 0,
		whichboss = 0,
		hooks = [], bossCurLocation, bossCurAngle, uid0 = 999999999, uid1 = 899999999, uid2 = 799999999;

	d.command.add('ccinfo', (arg) => {
		d.command.message('模块开关: ' + `${enabled}`.clr('00FFFF'));
		d.command.message('副本地图: ' + insidemap);
		d.command.message('区域位置: ' + insidezone);
		d.command.message('副本难度: ' + whichmode);
		d.command.message('副本首领: ' + whichboss);
		d.command.message('发送通知 ' + (sendToParty ? '真实组队'.clr('56B4E9') : '仅自己见'.clr('E69F00')));
		d.command.message('职业分类 ' + (isTank ? '坦克'.clr('00FFFF') : '打手'.clr('FF0000')));
		sendMessage('test');
	})
	d.command.add('ccg', (arg) => {
		if (!arg) {
			enabled = !enabled;
			d.command.message('辅助提示 ' + (enabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
		} else {
			switch (arg) {
				case "party":
					sendToParty = !sendToParty;
					d.command.message('发送通知 ' + (sendToParty ? '组队'.clr('56B4E9') : '自己'.clr('E69F00')));
					break;
				case "proxy":
					streamenabled = !streamenabled;
					d.command.message('代理频道 ' + (streamenabled ? '启用'.clr('56B4E9') : '禁用'.clr('E69F00')));
					break;
				default :
					d.command.message('无效的参数!'.clr('FF0000'));
					break;
			}
		}
	});

	d.hook('S_LOGIN', 10, sLogin)
	d.hook('S_LOAD_TOPO', 3, sLoadTopo);

	function sLogin(event) {
		let job = (event.templateId - 10101) % 100;
		if (job === 1 || job === 10) {
			isTank = true;
		} else {
			isTank = false;
		}
	}

	function sLoadTopo(event) {
		if (event.zone === mapID[0]) {								
			insidemap = true;
			d.command.message('进入副本: ' + '泰内布利斯城堡 '.clr('56B4E9') + '[下级]'.clr('E69F00'));
			load();
		} else if (event.zone === mapID[1]) {
			insidemap = true;
			d.command.message('进入副本: ' + '泰内布利斯城堡 '.clr('56B4E9') + '[上级]'.clr('00FFFF'));
			load();
		} else {
			unload();
		}
    }

	function load() {
		if (!hooks.length) {
			hook('S_BOSS_GAGE_INFO', 3, sBossGageInfo);
			hook('S_ACTION_STAGE', 8, sActionStage);
			hook('S_DUNGEON_EVENT_MESSAGE', 2,sDungeonEventMessage);
			function sBossGageInfo(event) {
				if (!insidemap) return;

				let bosshp = (event.curHp / event.maxHp);

				if (bosshp <= 0) {
					whichboss = 0;
				}

				if (event.huntingZoneId == HuntingZn[0]) {
					insidezone = true;
					whichmode = 1;
				} else if (event.huntingZoneId == HuntingZn[1]) {
					insidezone = true;
					whichmode = 2;
				} else {
					insidezone = false;
					whichmode = 0;
				}

				if (event.templateId == BossID[0]) whichboss = 1;
				else if (event.templateId == BossID[1]) whichboss = 2;
				else if (event.templateId == BossID[2]) whichboss = 3;
				else whichboss = 0;
			}

			function sActionStage(event) {
				if (!enabled || !insidezone || whichboss==0) return;
				if (event.templateId!=BossID[0] && event.templateId!=BossID[1] && event.templateId!=BossID[2]) return;
				let skillid = event.skill.id % 1000;
				bossCurLocation = event.loc;
				bossCurAngle = event.w;

				if (whichboss==1 && FirstBossActions[skillid]) {
					if (!isTank && skillid === 119) return; // 打手职业 不提示的技能
					sendMessage(FirstBossActions[skillid].msg);
				}
				if (whichboss==2 && SecondBossActions[skillid]) {
					if (!isTank && skillid === 110) return; // 打手职业 不提示的技能
					if ( isTank && (skillid === 111 || skillid === 115)) return; // 坦克职业 不提示的技能
					sendMessage(SecondBossActions[skillid].msg);

					if (skillid === 318) {
						// 2王 属性攻击 - 草地圈范围
						Spawnitem(603, 20, 670);
						Spawnitem(603, 40, 670);
						Spawnitem(603, 60, 670);
						Spawnitem(603, 80, 670);
						Spawnitem(603, 100, 670);
						Spawnitem(603, 120, 670);
						Spawnitem(603, 140, 670);
						Spawnitem(603, 160, 670);
						Spawnitem(603, 180, 670);
						Spawnitem(603, 200, 670);
						Spawnitem(603, 220, 670);
						Spawnitem(603, 240, 670);
						Spawnitem(603, 260, 670);
						Spawnitem(603, 280, 670);
						Spawnitem(603, 300, 670);
						Spawnitem(603, 320, 670);
						Spawnitem(603, 340, 670);
						Spawnitem(603, 360, 670);
					}
				}
				if (whichboss==3 && ThirdBossActions[skillid]) {
					if (!isTank && (skillid === 106 || skillid === 109)) return; // 打手职业 不提示的技能
					if ( isTank && skillid === 112) return; // 坦克职业 不提示的技能
					sendMessage(ThirdBossActions[skillid].msg);

					// 3王 前S后S 弧线
					if (skillid === 303) {
						Spawnitem(603, 80, 250);
						Spawnitem(603, 70, 250);
						Spawnitem(603, 60, 250);

						Spawnitem(603, 260, 250);
						Spawnitem(603, 250, 250);
						Spawnitem(603, 240, 250);
					}
					if (skillid === 306) {
						Spawnitem(603, 100, 250);
						Spawnitem(603, 110, 250);
						Spawnitem(603, 120, 250);

						Spawnitem(603, 280, 250);
						Spawnitem(603, 290, 250);
						Spawnitem(603, 300, 250);
					}
					// 3王 前S后S 横向对称轴
					if (skillid === 303 || skillid === 306) {
						Spawnitem(603, 90, 25);
						Spawnitem(603, 90, 50);
						Spawnitem(603, 90, 75);
						Spawnitem(603, 90, 100);
						Spawnitem(603, 90, 125);
						Spawnitem(603, 90, 150);
						Spawnitem(603, 90, 175);
						Spawnitem(603, 90, 200);
						Spawnitem(603, 90, 225);
						Spawnitem(603, 90, 250);
						Spawnitem(603, 90, 275);
						Spawnitem(603, 90, 300);
						Spawnitem(603, 90, 325);
						Spawnitem(603, 90, 350);
						Spawnitem(603, 90, 375);
						Spawnitem(603, 90, 400);
						Spawnitem(603, 90, 425);
						Spawnitem(603, 90, 450);
						Spawnitem(603, 90, 475);
						Spawnitem(603, 90, 500);

						Spawnitem(603, 270, 25);
						Spawnitem(603, 270, 50);
						Spawnitem(603, 270, 75);
						Spawnitem(603, 270, 100);
						Spawnitem(603, 270, 125);
						Spawnitem(603, 270, 150);
						Spawnitem(603, 270, 175);
						Spawnitem(603, 270, 200);
						Spawnitem(603, 270, 225);
						Spawnitem(603, 270, 250);
						Spawnitem(603, 270, 275);
						Spawnitem(603, 270, 300);
						Spawnitem(603, 270, 325);
						Spawnitem(603, 270, 350);
						Spawnitem(603, 270, 375);
						Spawnitem(603, 270, 400);
						Spawnitem(603, 270, 425);
						Spawnitem(603, 270, 450);
						Spawnitem(603, 270, 475);
						Spawnitem(603, 270, 500);
						// 3王 前S后S 光柱+告示牌
						SpawnThing(ThirdBossActions[skillid].sign_degrees, ThirdBossActions[skillid].sign_distance, 5000);
					}
				}
			}

			function sDungeonEventMessage(event) {
				if (!enabled || !insidezone || whichboss==0) return;
				let sDungeonEventMessage = parseInt(event.message.replace('@dungeon:', ''));
				if (whichboss==1) {
					if (sDungeonEventMessage === 9783103 || sDungeonEventMessage === 9983103) {
						sendMessage('100能量鉴定!!');
					}
				}
			}
		}
	}

	function hook() {
		hooks.push(d.hook(...arguments));
	}

	function unload() {
		if (hooks.length) {
			for (let h of hooks)
				d.unhook(h);
			hooks = [];
		}
		reset();
	}

	function reset() {
		insidemap = false;
		insidezone = false;
		whichmode = 0;
		whichboss = 0;
	}

	function sendMessage(msg) {
		if (msgcolour) {
			msg = `${msg}`.clr(msgcolour);
		}

		if (sendToParty) {
			d.toServer('C_CHAT', 1, {
				channel: 21, //21 = p-notice, 1 = party, 2 = guild
				message: msg
			});
		} else if (streamenabled) {
			d.command.message(msg);
		} else {
			d.toClient('S_CHAT', 2, {
				channel: 21, //21 = p-notice, 1 = party
				authorName: 'DG-Guide',
				message: msg
			});
		}
	}
	//地面提示(花朵)
	function Spawnitem(item, degrees, radius) { //显示物品 偏移角度 半径距离
		let r = null, rads = null, finalrad = null, spawnx = null, spawny = null, pos = null;

		r = bossCurAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		spawnx = bossCurLocation.x + radius * Math.cos(finalrad);
		spawny = bossCurLocation.y + radius * Math.sin(finalrad);
		pos = {x:spawnx, y:spawny};

		d.toClient('S_SPAWN_COLLECTION', 4, {
			gameId : uid0,
			id : item,
			amount : 1,
			loc : new Vec3(pos.x, pos.y, bossCurLocation.z),
			w : r,
			unk1 : 0,
			unk2 : 0
		});

		setTimeout(Despawn, 5000, uid0)
		uid0--;
	}
	//消除花朵
	function Despawn(uid_arg0) {
		d.toClient('S_DESPAWN_COLLECTION', 2, {
			gameId : uid_arg0
		});
	}
	//地面提示(光柱+告示牌)
	function SpawnThing(degrees, radius, times) { //偏移角度 半径距离 持续时间
		let r = null, rads = null, finalrad = null, pos = null;

		r = bossCurAngle - Math.PI;
		rads = (degrees * Math.PI/180);
		finalrad = r - rads;
		bossCurLocation.x = bossCurLocation.x + radius * Math.cos(finalrad);
		bossCurLocation.y = bossCurLocation.y + radius * Math.sin(finalrad);

		d.toClient('S_SPAWN_BUILD_OBJECT', 2, { //告示牌
			gameId : uid1,
			itemId : 1,
			loc : bossCurLocation,
			w : r,
			unk : 0,
			ownerName : '提示',
			message : '提示区'
		});

		setTimeout(DespawnThing, times, uid1, uid2);
		uid1--;

		bossCurLocation.z = bossCurLocation.z - 100;

		d.toClient('S_SPAWN_DROPITEM', 6, { //龙头光柱
			gameId: uid2,
			loc: bossCurLocation,
			item: 98260,
			amount: 1,
			expiry: 6000,
			owners: [{playerId: uid2}]
		});
		uid2--;
	}
	//消除 光柱+告示牌
	function DespawnThing(uid_arg1, uid_arg2) {
		d.toClient('S_DESPAWN_BUILD_OBJECT', 2, {
			gameId : uid_arg1,
			unk : 0
		});
		d.toClient('S_DESPAWN_DROPITEM', 4, {
			gameId: uid_arg2
		});
	}

}