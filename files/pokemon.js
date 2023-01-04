function update_score_display(user_data) {
	$("#signed_in").html('Logged in as '+user_data[0].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')+' ('+user_data[1]+' points)<button class="game_login" id="sign_out">Sign Out</button>');
}

$(function() {
		
	let socket = io("http://localhost:9000");
	let deadline = null;

	socket.on("not logged in", function() {
		$(".not_logged_in").css("display", "block");
	});
	
	socket.on("welcome", function(user_data) {
		$("#guess_entry").attr("disabled",false);
		$("#send").attr("disabled",false);
		$("#send").css("visibility","visible");
		$("#input_section").css("display","flex");
		$("#guess_entry").attr("value","");
		$("#input_section").css("background-color","#FFFFFF");
		$("#signed_out").css("display","none");
		$("#signed_in").css("display","block");		
		update_score_display(user_data);
	});
	
	socket.on("received message", function(msg) {
		$("#guess_box").append('<p class="message"><b>'+msg[1].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') + ':</b> '+msg[0].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') + '</p>');
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);		
	});

	socket.on("failed", function(answer) {
		$("#guess_box").append('<p class="server_message">Nobody got it? The answer was '+answer+'!</p>');
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);
	});

	socket.on("leaderboard", function(leaderboard) {
		let full_string="";
		let pos=1;
		leaderboard.forEach(function (item, index) {
		  full_string=full_string.concat("<p class='leaderboard_position'><b>#"+pos+" "+item["user_name"].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')+":</b> "+item["user_score"]+"<br></p>");
		  pos+=1;
		});
		console.log(full_string);
		$("#leaderboard_contents").html(full_string);
	});

	socket.on("correct", function(answer) {
		$("#guess_box").append("<p class='correct'>It's "+answer[0]+"!<br>"+answer[1]+" now has "+answer[2]+" points.</p>");
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);
	});

	socket.on("update score", function(user_data) {
		update_score_display(user_data);
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
	
	socket.on("login required", function() {
		window.location.replace("login.html");
	});

	$("#send").click(function() {
		socket.emit("sent message", [$("#guess_entry").val(),document.cookie]);
		$("#guess_entry").val("");
	});
	
	$("#sign_out").click(function() {
		socket.emit("log out", document.cookie);
		document.cookie="";
		location.reload();		
	});

	$('#guess_entry').keypress(function (e) {
	  if (e.which == 13) {
		socket.emit("sent message", [$("#guess_entry").val(),document.cookie]);
		$("#guess_entry").val("");
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

