var WIDTH = 1100;
var HEIGHT = 580;

var socket = io.connect(''ip':8082');		//La ip del servidor
var game = new Game('#arena', WIDTH, HEIGHT, socket);
var selectedSpacecraft = 1;
var spacecraftName = '';

socket.on('addSpacecraft', function(spacecraft){
	game.addSpacecraft(spacecraft.id, spacecraft.type, spacecraft.isLocal, spacecraft.x, spacecraft.y);
});

socket.on('sync', function(gameServerData){
	game.receiveData(gameServerData);
});

socket.on('killSpacecraft', function(spacecraftData){
	game.killSpacecraft(spacecraftData);
});

socket.on('removeSpacecraft', function(spacecraftId){
	game.removeSpacecraft(spacecraftId);
});

$(document).ready( function(){

	$('#join').click( function(){
		spacecraftName = $('#spacecraft-name').val();
		joinGame(spacecraftName, selectedSpacecraft, socket);
	});

	$('#spacecraft-name').keyup( function(e){
		spacecraftName = $('#spacecraft-name').val();
		var k = e.keyCode || e.which;
		if(k == 13){
			joinGame(spacecraftName, selectedSpacecraft, socket);
		}
	});

	$('ul.spacecraft-selection li').click( function(){
		$('.spacecraft-selection li').removeClass('selected')
		$(this).addClass('selected');
		selectedSpacecraft = $(this).data('spacecraft');
	});

});

$(window).on('beforeunload', function(){
	socket.emit('leaveGame', spacecraftName);
});

function joinGame(spacecraftName, spacecraftType, socket){
	if(spacecraftName != ''){
		$('#prompt').hide();
		socket.emit('joinGame', {id: spacecraftName, type: spacecraftType});
	}
}
