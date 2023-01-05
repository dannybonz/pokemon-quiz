$(function() {
	//Connect socket
	let socket = io("http://localhost:9000");
	let deadline = null; //Used to store remaining time on question

	//Used to send a guess to the server
	function submit_guess() {
		socket.emit("sent guess", [$("#guess_entry").val(),document.cookie]); //Send guess along with session cookie
		$("#guess_entry").val(""); //Clear entry
	}
	
	//Used to update the score and "logged in as" message
	function update_score_display(user_data) {
		$("#signed_in").html('Logged in as '+user_data[0].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')+' ('+user_data[1]+' points)<button class="game_login" id="sign_out">Sign Out</button>');
	}	

	//This message is sent by the server if the client is not logged in
	socket.on("not logged in", function() { 
		$(".not_logged_in").css("display", "block");
	});
	
	//This message is sent by the server if the client is logged in
	socket.on("welcome", function(user_data) {
		$("#guess_entry").attr("disabled",false); //Enable guess entry input
		$("#send").attr("disabled",false); //Enable send button
		$("#send").css("visibility","visible"); //Make the send button visible
		$("#guess_entry").attr("value",""); //Reset the entry text
		$("#input_section").css("background-color","#FFFFFF"); //Make guess entry background colour white
		$("#signed_out").css("display","none"); //Hide the "signed out" message
		$("#signed_in").css("display","block"); //Show the "signed in" message
		update_score_display(user_data);
	});
	
	//This message is sent by the server when another user submits a guess
	socket.on("received message", function(msg) {
		$("#guess_box").append('<p class="message"><b>'+msg[1].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') + ':</b> '+msg[0].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;') + '</p>'); //Display the other user's guess, escaping special characters
		$("#guess_box").animate({scrollTop: $('#guess_box').prop("scrollHeight")}, 500); //Smoothly animate the guess box scrolling the new message into view
	});

	//This message is sent by the sever when nobody answers the question in time
	socket.on("failed", function(answer) {
		$("#guess_box").append('<p class="server_message">Nobody got it? The answer was '+answer+'!</p>'); //Display the correct answer in the guesses box
		$("#guess_box").animate({scrollTop: $('#guess_box').prop("scrollHeight")}, 500);
	});
	
	//This message is sent by the server when the leaderboard updates
	socket.on("leaderboard", function(leaderboard) {
		let full_string="";
		let pos=1; //Used for display of #1, #2, #3, etc.
		leaderboard.forEach(function (item, index) { //Loop through every leaderboard entry
		  full_string=full_string.concat("<p class='leaderboard_position'><b>#"+pos+" "+item["user_name"].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')+":</b> "+item["user_score"]+"<br></p>"); //Add the user and score into the leaderboard HTML string, escaping special characters
		  pos+=1;
		});
		$("#leaderboard_contents").html(full_string); //Display the finished leaderboard contents
	});

	//This message is sent by the server when a user guesses correctly
	socket.on("correct", function(answer) {
		$("#guess_box").append("<p class='correct'>It's "+answer[0]+"!<br>"+answer[1].replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')+" now has "+answer[2]+" points.</p>"); //Display the correct answer, along with the username of the person who guessed it, escaping special characters
		$("#guess_box").animate({scrollTop: $('#guess_box').prop("scrollHeight")}, 500);
	});

	//This message is sent by the server when the client's score has changed
	socket.on("update score", function(user_data) {
		update_score_display(user_data);
	});

	//This message is sent by the server when a new question has been generated
	socket.on("new pokemon", function(pokemon) {
		$("#guess_box").append('<p class="server_message">A new Pokémon appeared!</p>'); 
		$("#guess_box").animate({ scrollTop: $('#guess_box').prop("scrollHeight")}, 500);		
		$("#pokemon_image").css('background-image', 'url('+pokemon[0]+')'); //Set new Pokémon image
		deadline = pokemon[1];
		let now = new Date();
		let time_since_epoch = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); //Find time since epoch (negates timezone differences)
		let difference = deadline - time_since_epoch;
		remaining_time = difference; //Time until deadline passes
	});
	
	//This message is sent by the server if the client attempst to submit a guess when it is not logged in
	socket.on("login required", function() {
		window.location.replace("login.html"); //Redirect to login page 
	});

	//When the Send button is clicked
	$("#send").click(function() {
		submit_guess();
	});
	
	//If a key is pressed within the input box
	$('#guess_entry').keypress(function (e) {
	  if (e.which == 13) { //If the Enter key is pressed
		submit_guess(); 
	  }
	});

	//Event listener for clicking on sign out button
	$("body").on("click", "#sign_out", function(){
		socket.emit("log out", document.cookie); //Tell server this client is logging out
		document.cookie=""; //Reset cookie
		location.reload(); //Refresh page
	});

	socket.emit("joined game", document.cookie); //Tell server this client has joined the game
 
	//Set interval for updating the current question's remaining time
	var intervalId = window.setInterval(function(){ 
		let now = new Date();
		let time_since_epoch = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
		let difference = deadline - time_since_epoch;
		remaining_time = difference;
		$("#timer").width(Math.floor(remaining_time/1000)+"%"); //Set width of timer to reflect seconds remaining
	}, 1000);
});

