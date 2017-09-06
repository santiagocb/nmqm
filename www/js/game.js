const INTERVAL = 50;

function Game(arenaId, w, h, socket){
	this.spacecrafts = [];
	this.balls = [];
	this.width = w;
	this.height = h;
	this.$arena = $(arenaId);
	this.$arena.css('width', w);
	this.$arena.css('height', h);
	this.socket = socket;

	var g = this;
	setInterval(function(){
		g.mainLoop();
	}, INTERVAL);
}

Game.prototype = {

	addSpacecraft: function(id, type, isLocal, x, y, hp){
		var t = new Spacecraft(id, type, this.$arena, this, isLocal, x, y, hp);
		if(isLocal){
			this.localSpacecraft = t;
		}else{
			this.spacecrafts.push(t);
		}
	},

	removeSpacecraft: function(spacecraftId){
		this.spacecrafts = this.spacecrafts.filter( function(t){return t.id != spacecraftId} );
		$('#' + spacecraftId).remove();
		$('#info-' + spacecraftId).remove();
	},

	killSpacecraft: function(spacecraft){
		spacecraft.dead = true;
		this.removeSpacecraft(spacecraft.id);
		//lugar donde explota
		this.$arena.append('<img id="expl' + spacecraft.id + '" class="explosion" src="./img/space-explosion.gif">');
		$('#expl' + spacecraft.id).css('left', (spacecraft.x - 50)  + 'px');
		$('#expl' + spacecraft.id).css('top', (spacecraft.y - 100)  + 'px');

		setTimeout(function(){
			$('#expl' + spacecraft.id).remove();
		}, 1000);
	},

	mainLoop: function(){
		if(this.localSpacecraft != undefined){
			//Enviar data al server del spacecraft local
			this.sendData();
			//Mover spacecraft local
			this.localSpacecraft.move();
		}
	},

	sendData: function(){
		//Enviar local data al server
		var gameData = {};

		//Enviar spacecraft data
		var t = {
			id: this.localSpacecraft.id,
			x: this.localSpacecraft.x,
			y: this.localSpacecraft.y,
			baseAngle: this.localSpacecraft.baseAngle,
			cannonAngle: this.localSpacecraft.cannonAngle
		};
		gameData.spacecraft = t;
		//El cliente no manda data de las balls que le corresponden
		//el servidor controla esa parte
		this.socket.emit('sync', gameData);
	},

	receiveData: function(serverData){
		var game = this;

		serverData.spacecrafts.forEach( function(serverSpacecraft){

			//Actualiza datos del spacecraft local
			if(game.localSpacecraft !== undefined && serverSpacecraft.id == game.localSpacecraft.id){
				game.localSpacecraft.hp = serverSpacecraft.hp;
				if(game.localSpacecraft.hp <= 0){
					game.killSpacecraft(game.localSpacecraft);
				}
			}

			//Actualiza datos de los spacecrafts rivales
			var found = false;
			game.spacecrafts.forEach( function(clientSpacecraft){
				if(clientSpacecraft.id == serverSpacecraft.id){
					clientSpacecraft.x = serverSpacecraft.x;
					clientSpacecraft.y = serverSpacecraft.y;
					clientSpacecraft.baseAngle = serverSpacecraft.baseAngle;
					clientSpacecraft.cannonAngle = serverSpacecraft.cannonAngle;
					clientSpacecraft.hp = serverSpacecraft.hp;
					if(clientSpacecraft.hp <= 0){
						game.killSpacecraft(clientSpacecraft);
					}
					clientSpacecraft.refresh();
					found = true;
				}
			});
			if(!found &&
				(game.localSpacecraft == undefined || serverSpacecraft.id != game.localSpacecraft.id)){
				game.addSpacecraft(serverSpacecraft.id, serverSpacecraft.type, false, serverSpacecraft.x, serverSpacecraft.y, serverSpacecraft.hp);
			}
		});

		game.$arena.find('.cannon-ball').remove();

		serverData.balls.forEach( function(serverBall){
			var b = new Ball(serverBall.id, serverBall.ownerId, game.$arena, serverBall.x, serverBall.y);
			b.exploding = serverBall.exploding;
			if(b.exploding){
				b.explode();
			}
		});
	}
}
