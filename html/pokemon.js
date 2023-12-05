$(function($) {
	//Connect socket
	let socket = io("server");
	let deadline = null; //Used to store remaining time on question
	let mobile = false;
	let pokemon_info = null;
	
	const canvas = document.getElementById('pokemon_image');
	const ctx = canvas.getContext('2d');

	//Used to send a guess to the server
	function submit_guess() {
		let cleaned_guess = remove_special_characters($("#guess_entry").val().trim());
		if (cleaned_guess.length>0) { //Cannot send an empty message
			socket.emit("sent guess", [cleaned_guess,localStorage.getItem("session")]); //Send guess along with session
			$("#guess_entry").val(""); //Clear entry
		}
	}
	
	function add_message(message) {
		if (mobile==true) { //On mobile
			$(message).hide().prependTo("#guess_box").show('fast'); //Insert new message at top
		}
		else {
			$(message).hide().appendTo("#guess_box").show('fast'); //Insert new message at top
			$("#guess_box").animate({scrollTop: $('#guess_box').prop("scrollHeight")}, 500); //Smoothly animate the guess box scrolling the new message into view
		}		
	}
	
	function remove_special_characters(string) {
		return string.replace(/[^a-zA-Z0-9 .-]/g, "")
	}
	
	function draw_pokemon(blur_amount) {
		//Safari can't handle a smoother blur
		if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
			blur_amount = Math.ceil(blur_amount);
		}
		const img = new Image();
		img.src = "pokemon/" + pokemon_info[0];
		img.onload = function() {
			//Draw Pokémon image to separate canvas
			let pokemon_canvas = document.createElement('canvas');
			pokemon_canvas.width = canvas.width;
			pokemon_canvas.height = canvas.height;
			let pokemon_ctx = pokemon_canvas.getContext('2d');
			pokemon_ctx.fillStyle = "#F2F2F2";
			pokemon_ctx.fillRect(0, 0, pokemon_canvas.width, pokemon_canvas.height);
			pokemon_ctx.drawImage(img, 0, 0, pokemon_canvas.width, pokemon_canvas.height);

			//Draw Pokémon canvas to main canvas
			ctx.filter = 'blur('+blur_amount+'px)';
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(pokemon_canvas, 0, 0, pokemon_canvas.width, pokemon_canvas.height);
		};
	}
	
	//Used to update the score and "logged in as" message
	function update_score_display(user_data) {
		$("#signed_in").html('Logged in as '+remove_special_characters(user_data[0])+' ('+user_data[1]+' points)<button class="game_login navbar_button" id="sign_out">Sign Out</button>');
	}	
	
	$(document).ready(function() {
		if ($(window).width() < 1000) {
			$("#input_section").insertBefore($("#guess_box"));
			mobile = true;
		} else {
			$("#input_section").insertAfter($("#guess_box"));
		}
	})

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
		$("#entry_login").css("display","none");
		$("#guess_entry").css("display","block");
		$("#send").css("display","block");
		update_score_display(user_data);
	});
	
	//This message is sent by the server when another user submits a guess
	socket.on("user guess", function(msg) {
		let element_contents='<p class="message"><b>'+remove_special_characters(msg[1])+':</b> '+remove_special_characters(msg[0])+'</p>'; //Generate <p> element stripping away special characters
		add_message(element_contents);
	});

	//This message is sent by the sever when nobody answers the question in time
	socket.on("failed", function(answer) {
		let element_contents=('<p class="server_message">Nobody got it? The answer was '+answer+'!</p>'); //Display the correct answer in the guesses box
		add_message(element_contents);
	});
	
	//This message is sent by the server when the leaderboard updates
	socket.on("leaderboard", function(leaderboard) {
		let full_string="";
		let pos=1; //Used for display of #1, #2, #3, etc.
		leaderboard.forEach(function (item, index) { //Loop through every leaderboard entry
		  full_string=full_string.concat("<p class='leaderboard_position'><b>#"+pos+" "+remove_special_characters(item["user_name"])+":</b> "+item["user_score"]+"<br></p>"); //Add the user and score into the leaderboard HTML string, escaping special characters
		  pos+=1;
		});
		$("#leaderboard_contents").html(full_string); //Display the finished leaderboard contents
	});

	//This message is sent by the server when a user guesses correctly
	socket.on("correct", function(msg) {
		let points = "pts";
		if (msg[3]=="1") {
			points = "pt";
		}
		let element_contents='<p class="message correct_guess"><b>'+remove_special_characters(msg[1])+':</b> '+remove_special_characters(msg[0])+'<span class="scored_points">+'+msg[3]+points+'</span></p>';
		add_message(element_contents);
	});

	//This message is sent by the server when the client's score has changed
	socket.on("update score", function(user_data) {
		update_score_display(user_data);
	});

	//This message is sent by the server when a new question has been generated
	socket.on("new pokemon", function(pokemon) {
		pokemon_info=pokemon;
		let element_contents='<p class="server_message">A new Pokémon appeared!</p>';
		add_message(element_contents);
		deadline = pokemon[1];
		let now = new Date();
		let time_since_epoch = now.getTime() + (now.getTimezoneOffset() * 60 * 1000); //Find time since epoch (negates timezone differences)
		let difference = deadline - time_since_epoch;
		remaining_time = difference; //Time until deadline passes
	});
	
	//This message is sent by the server if the client attempts to submit a guess when it is not logged in
	socket.on("login required", function() {
		window.location.replace("login"); //Redirect to login page 
	});

	//When the Send button is clicked
	$("#send").click(function() {
		submit_guess();
	});
	
	//If a key is pressed within the input box
	$('#guess_entry').keypress(function (e) {
		if (e.which == 13) { //If the Enter key is pressed
			submit_guess(); 
		} else {
			var regex = new RegExp("^[a-zA-Z0-9 .-]+$");
			var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
			if (!regex.test(key)) {
				event.preventDefault();
			}
		}
	});

	//Event listener for clicking on sign out button
	$("body").on("click", "#sign_out", function(){
		socket.emit("log out", localStorage.getItem("session")); //Tell server this client is logging out
		localStorage.setItem("session", ""); //Reset session
		location.reload(); //Refresh page
	});

	socket.emit("joined game", localStorage.getItem("session")); //Tell server this client has joined the game

	//Set interval for redrawing the Pokémon image and timer bar
	var intervalId = window.setInterval(function(){ 
		let now = new Date();
		let time_since_epoch = now.getTime();
		let difference = deadline - time_since_epoch;
		remaining_time = difference;
		if (remaining_time > 5000) {
			draw_pokemon(((remaining_time - 5000) / 15000)*50); //Redraw Pokémon image with set blur amount
		} else {
			draw_pokemon(0); //Redraw Pokémon image with set blur amount			
		}
		$("#timer").width((remaining_time/18500 * 100)+"%"); //Set width of timer to reflect seconds remaining
	}, 100);
});

