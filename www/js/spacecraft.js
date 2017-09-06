var DEBUG = true;
var ROTATION_SPEED = 5;
var ARENA_MARGIN = 40;

//Clase Spacecraft
function Spacecraft(id, type, $arena, game, isLocal, x, y, hp){
	this.id = id;
	this.type = type;
	this.speed = 5;
	this.$arena = $arena;
	this.w = 60;
	this.h = 80;
	this.baseAngle = getRandomInt(0, 360);
	this.baseAngle -= (this.baseAngle % ROTATION_SPEED);
	this.cannonAngle = 0;
	this.x = x;
	this.y = y;
	this.mx = null;
	this.my = null;
	this.dir = {
		up: false,
		down: false,
		left: false,
		right: false
	};
	this.game = game;
	this.isLocal = isLocal;
	this.hp = hp;
	this.dead = false;

	this.materialize();
}

//Otra forma de declarar las funciones de una clase. Usando prototype.
Spacecraft.prototype = {

	materialize: function(){
		this.$arena.append('<div id="' + this.id + '" class="spacecraft spacecraft' + this.type + '"></div>');
		this.$body = $('#' + this.id);
		this.$body.css('width', this.w);
		this.$body.css('height', this.h);

		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

		this.$body.append('<div id="cannon-' + this.id + '" class="spacecraft-cannon"></div>');
		this.$cannon = $('#cannon-' + this.id);

		this.$arena.append('<div id="info-' + this.id + '" class="info"></div>');
		this.$info = $('#info-' + this.id);
		this.$info.append('<div class="label">' + this.id + '</div>');
		this.$info.append('<div class="hp-bar"></div>');

		this.refresh();

		if(this.isLocal){
			this.setControls();
		}
	},

	isMoving: function(){
		return this.dir.up || this.dir.down || this.dir.left || this.dir.right;
	},

	refresh: function(){
		this.$body.css('left', this.x - 30 + 'px');
		this.$body.css('top', this.y - 40 + 'px');
		this.$body.css('-webkit-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-moz-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('-o-transform', 'rotateZ(' + this.baseAngle + 'deg)');
		this.$body.css('transform', 'rotateZ(' + this.baseAngle + 'deg)');

		var cannonAbsAngle = this.cannonAngle - this.baseAngle;
		this.$cannon.css('-webkit-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('-moz-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('-o-transform', 'rotateZ(' + cannonAbsAngle + 'deg)');
		this.$cannon.css('transform', 'rotateZ(' + cannonAbsAngle + 'deg)');

		this.$info.css('left', (this.x) + 'px');
		this.$info.css('top', (this.y) + 'px');
		if(this.isMoving()){
			this.$info.addClass('fade');
		}else{
			this.$info.removeClass('fade');
		}

		this.$info.find('.hp-bar').css('width', this.hp + 'px');
		this.$info.find('.hp-bar').css('background-color', getGreenToRed(this.hp));
	},

	setControls: function(){
		var t = this;

		//Detectar las entradas de teclado desde el document (html)
		$(document).keypress( function(e){
			var k = e.keyCode || e.which;
			switch(k){
				case 119: //W
					t.dir.up = true;
					break;
				case 100: //D
					t.dir.right = true;
					break;
				case 115: //S
					t.dir.down = true;
					break;
				case 97: //A
					t.dir.left = true;
					break;
			}

		}).keyup( function(e){					//Cuando la tecla se suelta
			var k = e.keyCode || e.which;
			switch(k){
				case 87: //W
					t.dir.up = false;
					break;
				case 68: //D
					t.dir.right = false;
					break;
				case 83: //S
					t.dir.down = false;
					break;
				case 65: //A
					t.dir.left = false;
					break;
			}
		}).mousemove( function(e){ //Detectar eventos del mouse
			t.mx = e.pageX - t.$arena.offset().left;
			t.my = e.pageY - t.$arena.offset().top;
			t.setCannonAngle();
		}).click( function(){
			t.shoot();					//callback hell
		});

	},

	move: function(){		//Método de movimiento de la nave
		if(this.dead){
			return;
		}

		var moveX = 0;
		var moveY = 0;

		if (this.dir.up) {
			moveY = -1;
		} else if (this.dir.down) {
			moveY = 1;
		}
		if (this.dir.left) {
			moveX = -1;
		} else if (this.dir.right) {
			moveX = 1;
		}

		moveX = this.speed * moveX;
		moveY = this.speed * moveY;

		if(this.x + moveX > (0 + ARENA_MARGIN) && (this.x + moveX) < (this.$arena.width() - ARENA_MARGIN)){
			this.x += moveX;
		}
		if(this.y + moveY > (0 + ARENA_MARGIN) && (this.y + moveY) < (this.$arena.height() - ARENA_MARGIN)){
			this.y += moveY;
		}
		this.rotateBase();
		this.setCannonAngle();
		this.refresh();
	},

	//Rotación de la base de la nave
	rotateBase: function(){
		if((this.dir.up && this.dir.left)
			|| (this.dir.down && this.dir.right)){ //diagonal "left"
			this.setDiagonalLeft();
		}else if((this.dir.up && this.dir.right)
			|| (this.dir.down && this.dir.left)){ //diagonal "right"
			this.setDiagonalRight();
		}else if(this.dir.up || this.dir.down){ //vertical
			this.setVertical();
		}else if(this.dir.left || this.dir.right){  //horizontal
			this.setHorizontal();
		}

	},

	// Rotar la base hace que sea vertical
	setVertical: function(){
		var a = this.baseAngle;
		if(a != 0 && a != 180){
			if(a < 90 || (a > 180 && a < 270)){
				this.decreaseBaseRotation();
			}else{
				this.increaseBaseRotation();
			}
		}
	},

	// Rotar la base hasta que sea horizontal
	setHorizontal: function(){
		var a = this.baseAngle;
		if(a != 90 && a != 270){
			if(a < 90 || (a > 180 && a < 270)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	setDiagonalLeft: function(){
		var a = this.baseAngle;
		if(a != 135 && a != 315){
			if(a < 135 || (a > 225 && a < 315)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	setDiagonalRight: function(){
		var a = this.baseAngle;
		if(a != 45 && a != 225){
			if(a < 45 || (a > 135 && a < 225)){
				this.increaseBaseRotation();
			}else{
				this.decreaseBaseRotation();
			}
		}
	},

	increaseBaseRotation: function(){
		this.baseAngle += ROTATION_SPEED;
		if(this.baseAngle >= 360){
			this.baseAngle = 0;
		}
	},

	decreaseBaseRotation: function(){
		this.baseAngle -= ROTATION_SPEED;
		if(this.baseAngle < 0){
			this.baseAngle = 0;
		}
	},

	setCannonAngle: function(){
		var spacecraft = { x: this.x , y: this.y};
		var deltaX = this.mx - spacecraft.x;
		var deltaY = this.my - spacecraft.y;
		this.cannonAngle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
		this.cannonAngle += 90;
	},

	shoot: function(){
		if(this.dead){
			return;
		}

		//Mandar una ball al server
		var serverBall = {};
		//Solo para ball locales que tiene un owner
		serverBall.alpha = this.cannonAngle * Math.PI / 180; //Angulo de tiro en radianes
		//Set la posicion inicial
		var cannonLength = 60;
		var deltaX = cannonLength * Math.sin(serverBall.alpha);
		var deltaY = cannonLength * Math.cos(serverBall.alpha);

		serverBall.ownerId = this.id;
		serverBall.x = this.x + deltaX - 5;
		serverBall.y = this.y - deltaY - 5;

		this.game.socket.emit('shoot', serverBall);
	}

}

function debug(msg){		//no usada
	if(DEBUG){
		console.log(msg);
	}
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

function getGreenToRed(percent){
	r = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
	g = percent>50 ? 255 : Math.floor((percent*2)*255/100);
	return 'rgb('+r+','+g+',0)';
}
