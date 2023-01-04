$(function() {
		
	let socket = io("http://localhost:9000");
	let deadline = null;

	socket.on("not logged in", function() {
		$(".not_logged_in").css("display", "block");
	});
	
	socket.on("welcome", function() {
		$("#msg").attr("disabled",false);
		$("#send").attr("disabled",false);
	});
	
	socket.on("received message", function(msg) {
		$("#guess_box").append('<p class="message"><b>'+msg[1] + ':</b> '+msg[0] + '</p>');
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);		
	});

	socket.on("failed", function(answer) {
		$("#guess_box").append('<p class="server_message">Nobody got it? The answer was '+answer+'!</p>');
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);
	});

	socket.on("leaderboard", function(leaderboard) {
		let full_string="";
		leaderboard.forEach(function (item, index) {
		  full_string=full_string.concat("<p class='leaderboard_position'><b>"+item["user_name"]+":</b> "+item["user_score"]+"<br></p>");
		});
		console.log(full_string);
		$("#leaderboard_contents").html(full_string);
	});

	socket.on("correct", function(answer) {
		$("#guess_box").append("<p class='correct'>It's "+answer[0]+"!<br>"+answer[1]+" now has "+answer[2]+" points.</p>");
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);
	});

	socket.on("new pokemon", function(pokemon) {
		$("#guess_box").append('<p class="server_message">A new Pokémon appeared!</p>');
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);		
		$("#pokemon_image").css('background-image', 'url(' + pokemon[0] + ')');
		deadline = pokemon[1];
		let now = new Date();
		let time_since_epoch = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
		let difference = deadline - time_since_epoch;
		remaining_time = difference;
	});

	$("#send").click(function() {
		socket.emit("sent message", [$("#msg").val(),document.cookie]);
		$("#msg").val("");
	})

	$('#msg').keypress(function (e) {
	  if (e.which == 13) {
		socket.emit("sent message", [$("#msg").val(),document.cookie]);
		$("#msg").val("");
	  }
	});

	socket.emit("joined game", document.cookie);
 
	var intervalId = window.setInterval(function(){
		let now = new Date();
		let time_since_epoch = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
		let difference = deadline - time_since_epoch;
		remaining_time = difference;
		$("#timer").width(Math.floor(remaining_time/1000)+"%");
	}, 1000);
});

