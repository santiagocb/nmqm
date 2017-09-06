var express = require('express');
var app = express();
var counter = 0;
const BALL_SPEED = 20;
const WIDTH = 1100;
const HEIGHT = 580;
const TANK_INIT_HP = 100;

app.use(express.static(__dirname + '/www'));

var server = app.listen(process.env.PORT || 8082, function () {
	var port = server.address().port;
	console.log('Server running at port %s', port);
});

var io = require('socket.io')(server);

function GameServer(){
	this.spacecrafts = [];
	this.balls = [];
	this.lastBallId = 0;

	this.addSpacecraft = function(spacecraft){
		this.spacecrafts.push(spacecraft);
	}
}

GameServer.prototype = {

	addBall: function(ball){
		this.balls.push(ball);
	},

	removeSpacecraft: function(spacecraftId){
		this.spacecrafts = this.spacecrafts.filter( function(t){return t.id != spacecraftId} );
	},

	//Sincronizar el spacecraft with con el data recibido desde el cliente
	syncSpacecraft: function(newSpacecraftData){
		this.spacecrafts.forEach( function(spacecraft){
			if(spacecraft.id == newSpacecraftData.id){
				spacecraft.x = newSpacecraftData.x;
				spacecraft.y = newSpacecraftData.y;
				spacecraft.baseAngle = newSpacecraftData.baseAngle;
				spacecraft.cannonAngle = newSpacecraftData.cannonAngle;
			}
		});
	},

	syncBalls: function(){
		var self = this;
		//Cuando las bolas están por fuera del margen
		this.balls.forEach( function(ball){
			self.detectCollision(ball);
			if(ball.x < 0 || ball.x > WIDTH
				|| ball.y < 0 || ball.y > HEIGHT){
				ball.out = true;
			}else{
				ball.fly();
			}
		});
	},

	//Colisión de la bola con cada spacecraft
	detectCollision: function(ball){
		var self = this;

		this.spacecrafts.forEach( function(spacecraft){
			if(spacecraft.id != ball.ownerId
				&& Math.abs(spacecraft.x - ball.x) < 30
				&& Math.abs(spacecraft.y - ball.y) < 30){
				spacecraft.hp -= 2;							//Herir al spacecraft
				ball.out = true;
				ball.exploding = true;
			}
		});
	},

	getData: function(){
		var gameData = {};
		gameData.spacecrafts = this.spacecrafts;
		gameData.balls = this.balls;

		return gameData;
	},

	cleanDeadSpacecrafts: function(){
		this.spacecrafts = this.spacecrafts.filter(function(t){
			return t.hp > 0;
		});
	},

	cleanDeadBalls: function(){
		this.balls = this.balls.filter(function(ball){
			return !ball.out;
		});
	},

	increaseLastBallId: function(){
		this.lastBallId ++;
		if(this.lastBallId > 1000){
			this.lastBallId = 0;
		}
	}

}

var game = new GameServer();

/* Eventos de conexión */

io.on('connection', function(client) {
	console.log('User connected');

	client.on('joinGame', function(spacecraft){
		console.log(spacecraft.id + ' joined the game');
		var initX = getRandomInt(40, 900);
		var initY = getRandomInt(40, 500);
		client.emit('addSpacecraft', { id: spacecraft.id, type: spacecraft.type, isLocal: true, x: initX, y: initY, hp: TANK_INIT_HP });
		client.broadcast.emit('addSpacecraft', { id: spacecraft.id, type: spacecraft.type, isLocal: false, x: initX, y: initY, hp: TANK_INIT_HP} );

		game.addSpacecraft({ id: spacecraft.id, type: spacecraft.type, hp: TANK_INIT_HP});
	});

	client.on('sync', function(data){
		if(data.spacecraft != undefined){
			game.syncSpacecraft(data.spacecraft);
		}
		game.syncBalls();
		client.emit('sync', game.getData());
		client.broadcast.emit('sync', game.getData());

		game.cleanDeadSpacecrafts();
		game.cleanDeadBalls();
		counter ++;
	});

	client.on('shoot', function(ball){
		var ball = new Ball(ball.ownerId, ball.alpha, ball.x, ball.y );
		game.addBall(ball);
	});

	client.on('leaveGame', function(spacecraftId){
		console.log(spacecraftId + ' has left the game');
		game.removeSpacecraft(spacecraftId);
		client.broadcast.emit('removeSpacecraft', spacecraftId);
	});

});

function Ball(ownerId, alpha, x, y){
	this.id = game.lastBallId;
	game.increaseLastBallId();
	this.ownerId = ownerId;
	this.alpha = alpha;
	this.x = x;
	this.y = y;
	this.out = false;
};

Ball.prototype = {

	fly: function(){
		var speedX = BALL_SPEED * Math.sin(this.alpha);
		var speedY = -BALL_SPEED * Math.cos(this.alpha);
		this.x += speedX;
		this.y += speedY;
	}

}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}
