$(function($) {
	//Load server address from config
	fetch('config.json').then(response => response.json()).then(config => {
		//Connect socket
		let socket = io(config.server);

		let deadline = null; //Used to store remaining time on question
		let mobile = false;
		let pokemon_info = null;
		let singleplayer_question_deadline = null;
		let singleplayer_game_deadline = null;
		let singleplayer_pokemon_info = null;
		let mode = "multiplayer";
		let username = null;
		let singleplayer_available = true;

		const multiplayer_canvas = document.getElementById('pokemon_image');
		const multiplayer_ctx = multiplayer_canvas.getContext('2d');
		const singleplayer_canvas = document.getElementById('singleplayer_pokemon_image');
		const singleplayer_ctx = singleplayer_canvas.getContext('2d');

		//Used to update UI to show the current mode
		function show_mode() {
			$(".mode_select").css("background-color","#F2F2F2");
			if (mode == "singleplayer") {
				$("#singleplayer").css("display", "block");
				$("#multiplayer").css("display", "none");
				$("#multiplayer_button").addClass("inactive_mode");
				$("#singleplayer_button").removeClass("inactive_mode");
				$("#selected_block").css("left", "50%");
			} else {
				$("#multiplayer").css("display", "block");
				$("#singleplayer").css("display", "none");
				$("#singleplayer_button").addClass("inactive_mode");
				$("#multiplayer_button").removeClass("inactive_mode");
				$("#selected_block").css("left", "0");
			}
		}
		show_mode("multiplayer"); //Show multiplayer by default

		$("#singleplayer_button").click(function() {
			mode = "singleplayer"; //Activate multiplayer mode
			show_mode(); //Update UI
		});

		$("#multiplayer_button").click(function() {
			mode = "multiplayer"; //Activate multiplayer mode
			show_mode(); //Update UI
		});

		$(".mode_button").hover(
			function() {
				if ($(this).hasClass("inactive_mode")) {
					$(".mode_select").css("background-color","#DBDBDB");
				}
			},
			function() {
				$(".mode_select").css("background-color","#F2F2F2");
			}
		);

		//Update the leaderboard and score element to reflect the given state
		function update_leaderboard(leaderboard) {
			let full_string="";
			let pos=1; //Used for display of #1, #2, #3, etc.
			leaderboard.forEach(function (item, index) { //Loop through every leaderboard entry
				if (item["user_name"] == username) { //If the score is that of the logged in user
					$("#multiplayer_score").html('Score: '+item["user_score"]+' (Rank #'+pos+')'); //Add ranking to "score text" element
				}
				full_string=full_string.concat("<p class='leaderboard_position'><b>#"+pos+". "+remove_special_characters(item["user_name"])+":</b> "+item["user_score"]+"<br></p>"); //Add the user and score into the leaderboard HTML string, escaping special characters
				pos+=1;
			});
			$("#leaderboard_contents").html(full_string); //Display the finished leaderboard contents
		}

		//Update the leaderboard and score element to reflect the given state
		function update_time_attack_leaderboard(leaderboard) {
			let full_string="";
			let pos=1; //Used for display of #1, #2, #3, etc.
			leaderboard.forEach(function (item, index) { //Loop through every leaderboard entry
				if (singleplayer_game_deadline == null && item["user_name"] == username) { //Not currently in a game and logged in as this user
					$("#singleplayer_score").html('Best: '+item["user_ta_score"]+' (Rank #'+pos+')'); //Add ranking to "score text" element
				}
				full_string=full_string.concat("<p class='leaderboard_position'><b>#"+pos+". "+remove_special_characters(item["user_name"])+":</b> "+item["user_ta_score"]+"<br></p>"); //Add the user and score into the leaderboard HTML string, escaping special characters
				pos+=1;
			});
			$("#singleplayer_leaderboard_contents").html(full_string); //Display the finished leaderboard contents
		}

		//Given a deadline, calculate how many seconds remain
		function get_remaining_time(deadline) {
			let now = new Date(); //Get current time
			let time_since_epoch = now.getTime(); //Get milliseconds since epoch
			let difference = deadline - time_since_epoch; 
			remaining_time = difference; //Time left until a new question needs to be displayed if no guess is made
			return(remaining_time);
		}

		//Used to send a guess to the server
		function submit_guess() {
			let cleaned_guess = remove_special_characters($("#guess_entry").val().trim());
			if (cleaned_guess.length>0) { //Cannot send an empty message
				socket.emit("sent guess", [cleaned_guess,localStorage.getItem("session")]); //Send guess along with session
				$("#guess_entry").val(""); //Clear entry
			}
		}

		//Used to send a guess in singleplayer game
		function submit_singleplayer_guess() {
			let cleaned_guess = remove_special_characters($("#singleplayer_entry").val().trim());
			if (cleaned_guess.length>0) { //Cannot send an empty message
				socket.emit("singleplayer guess", [cleaned_guess,localStorage.getItem("session")]); //Send guess along with session
				$("#singleplayer_entry").val(""); //Clear entry
			}
		}

		function add_message(message, element_id) {
			if (mobile==true) { //On mobile
				$(message).hide().prependTo(element_id).show('fast'); //Insert new message at top
			}
			else {
				$(message).hide().appendTo(element_id).show('fast'); //Insert new message at top
				$(element_id).animate({scrollTop: $(element_id).prop("scrollHeight")}, 500); //Smoothly animate the guess box scrolling the new message into view
			}		
		}
		
		function remove_special_characters(string) {
			return string.replace(/[^a-zA-Z0-9 .-]/g, "")
		}
		
		function draw_pokemon(pokemon_info, ctx, blur_amount) {
			//Safari can't handle a smoother blur
			if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
				blur_amount = Math.ceil(blur_amount);
			}
			const img = new Image();
			img.src = "pokemon/" + pokemon_info[0];
			img.onload = function() {
				//Draw Pokémon image to separate canvas
				let pokemon_canvas = document.createElement('canvas');
				pokemon_canvas.width = singleplayer_canvas.width;
				pokemon_canvas.height = singleplayer_canvas.height;
				let pokemon_ctx = pokemon_canvas.getContext('2d');
				pokemon_ctx.fillStyle = "#F2F2F2";
				pokemon_ctx.fillRect(0, 0, pokemon_canvas.width, pokemon_canvas.height);
				pokemon_ctx.drawImage(img, 0, 0, pokemon_canvas.width, pokemon_canvas.height);

				//Draw Pokémon canvas to main canvas
				ctx.filter = 'blur('+blur_amount+'px)';
				ctx.clearRect(0, 0, singleplayer_canvas.width, singleplayer_canvas.height);
				ctx.drawImage(pokemon_canvas, 0, 0, pokemon_canvas.width, pokemon_canvas.height);
			};
		}
				
		//Reorder elements for mobile or desktop display
		function reorder_elements() {
			if ($(".row").css("flex-direction") == "column") {
				$("#multiplayer_input_section").insertBefore($("#guess_box"));
				$("#singleplayer_input_section").insertBefore($("#singleplayer_history"));
				$("#game_timer_border").insertBefore($("#singleplayer_question_area"));
				mobile = true;
			} else {
				$("#multiplayer_input_section").insertAfter($("#guess_box"));
				$("#singleplayer_input_section").insertAfter($("#singleplayer_history"));
				$("#game_timer_border").insertAfter($("#singleplayer_guess_area"));
				mobile = false;
			}
		}

		$(document).ready(reorder_elements);
		$(window).resize(reorder_elements);

		//This message is sent by the server if the client is not logged in
		socket.on("not logged in", function() { 
			$(".not_logged_in").css("display", "block");
		});
		
		//This message is sent by the server if the client is logged in
		socket.on("welcome", function(user_data) {
			$(".guess_entry").attr("disabled",false); //Enable guess entry input
			$(".send_button").attr("disabled",false); //Enable send button
			$(".send_button").css("visibility","visible"); //Make the send button visible
			$(".guess_entry").attr("value",""); //Reset the entry text
			$(".input_section").addClass("active_input_section"); //Make guess entry background colour white
			$(".login_request").css("display","none"); //Hide any "signed out" messages
			$(".login_required").css("display","block"); //Show any elements that require a sign in 
			$("#signed_in").html('Logged in as '+remove_special_characters(user_data[0])+'<button class="game_login navbar_button" id="sign_out">Sign Out</button>');
			username = user_data[0];
			update_leaderboard(user_data[2]);
			update_time_attack_leaderboard(user_data[3]);
		});
		
		//This message is sent by the server when another user submits a guess
		socket.on("user guess", function(msg) {
			let element_contents='<p class="message"><b>'+remove_special_characters(msg[1])+':</b> '+remove_special_characters(msg[0])+'</p>'; //Generate <p> element stripping away special characters
			add_message(element_contents, "#guess_box");
		});

		//This message is sent by the server when a singleplayer guess is received
		socket.on("singleplayer guess", function(msg) {
			let element_contents='<p class="message"><b>'+remove_special_characters(msg[1])+':</b> '+remove_special_characters(msg[0])+'</p>'; //Generate <p> element stripping away special characters
			add_message(element_contents, "#singleplayer_history");
		});

		//This message is sent by the sever when nobody answers the question in time
		socket.on("failed", function(answer) {
			let element_contents=('<p class="server_message">Nobody got it? The answer was '+answer+'!</p>'); //Display the correct answer in the guesses box
			add_message(element_contents, "#guess_box");
		});

		//This message is sent by the sever in singleplayer mode if the question cannot be answered in time
		socket.on("singleplayer failed", function(answer) {
			let element_contents=('<p class="server_message">Too tough? The answer was '+answer+'!</p>'); //Display the correct answer in the guesses box
			add_message(element_contents, "#singleplayer_history");
		});

		//This message is sent by the server when the multiplayer leaderboard updates
		socket.on("leaderboard", function(leaderboard) {
			update_leaderboard(leaderboard);
		});

		//This message is sent by the server when the Time Attack leaderboard updates
		socket.on("ta leaderboard", function(time_attack_leaderboard) {
			update_time_attack_leaderboard(time_attack_leaderboard);
		});

		//This message is sent by the server when a user guesses correctly
		socket.on("correct", function(msg) {
			let points = "pts";
			if (msg[3]=="1") {
				points = "pt";
			}
			let element_contents='<p class="message correct_guess"><b>'+remove_special_characters(msg[1])+':</b> '+msg[0]+'<span class="scored_points">+'+msg[3]+points+'</span></p>';
			add_message(element_contents, "#guess_box");
		});

		socket.on("singleplayer correct", function(msg) {
			let points = "pts";
			if (msg[3]=="1") {
				points = "pt";
			}
			if (msg[4] > 0) {
				points += " +"+msg[4]+"s";
				singleplayer_game_deadline = msg[6];
			}
			let element_contents='<p class="message correct_guess"><b>'+remove_special_characters(msg[1])+':</b> '+remove_special_characters(msg[0])+'<span class="scored_points">+'+msg[3]+points+'</span></p>';
			add_message(element_contents, "#singleplayer_history");
			$("#singleplayer_score").html('Score: '+msg[2]+' (Best: '+msg[5]+')'); //Display current score
		});

		//This message is sent by the server when a new question has been generated
		socket.on("new pokemon", function(pokemon) {
			pokemon_info=pokemon;
			let element_contents='<p class="server_message">A new Pokémon appeared!</p>';
			add_message(element_contents, "#guess_box");
			deadline = pokemon[1];
		});

		//This message is sent by the server when a new question has been generated for singleplayer mode
		socket.on("singleplayer pokemon", function(pokemon) {
			singleplayer_pokemon_info = pokemon;
			let element_contents='<p class="server_message">A new Pokémon appeared!</p>';
			add_message(element_contents, "#singleplayer_history");
			singleplayer_question_deadline = pokemon[1];
		});

		//This message is sent by the server when a singleplayer game begins
		socket.on("start singleplayer", function(msg) {
			singleplayer_available = false; //Disable start button
			$("#singleplayer_history").addClass("active_singleplayer_history"); //Resize message history
			$(".singleplayer_instructions").css("display", "none"); //Hide instructions
			$(".singleplayer_input").css("display", "flex"); //Show input section
			$(".singleplayer_start_container").css("display", "none"); //Hide start button
			$("#singleplayer_score").html('Score: 0 (Best: '+msg[1]+')'); //Display score as 0 with best score bracketed
			singleplayer_game_deadline = msg[0]; //Set deadline
		});

		socket.on("end singleplayer", function(score) {
			singleplayer_game_deadline = null; //End game
			singleplayer_question_deadline = null; //End question
			$("#singleplayer_start_container").css("display", "block"); //Show start button
			$("#singleplayer_history").removeClass("active_singleplayer_history"); //Resize message history
			$("#singleplayer_history").empty(); //Clear singleplayer chat history
			$(".singleplayer_input").css("display", "none"); //Hide input section
			$("#singleplayer_question_timer").width("0px"); //Deplete question timer
			$("#singleplayer_game_timer").width("0px"); //Deplete question timer
			singleplayer_ctx.clearRect(0, 0, singleplayer_canvas.width, singleplayer_canvas.height); //Remove image
			$("#singleplayer_history").html('<div class="singleplayer_instructions"><p class="singleplayer_results"><b>Time\'s up!</b><br>Score: '+score+'</p><p class="singleplayer_results singleplayer_tip">Click the button below to try again.</p></div>');
			$("#start_singleplayer").html("Play Again");
			setTimeout(function() { //Re-enable the start button after a delay; prevents accidental restart
				singleplayer_available = true; //Enable start button
			}, 500);
		});
		
		//This message is sent by the server if the client attempts to submit a guess when it is not logged in
		socket.on("login required", function() {
			window.location.replace("login"); //Redirect to login page 
		});

		//When the Send button is clicked
		$(".send").click(function() {
			if ($(this).attr('id') == "send") { //In multiplayer
				submit_guess(); 
			} else { //Otherwise, singleplayer
				submit_singleplayer_guess();
			}	
		});

		//When the Send button is clicked in singleplayer mode
		$("#singleplayer_send").click(function() {
			submit_singleplayer_guess();
		});

		//If a key is pressed within the input box
		$('.guess_entry').keypress(function (e) {
			if (e.which == 13) { //If the Enter key is pressed
				if ($(this).attr('id') == "guess_entry") { //In multiplayer
					submit_guess(); 
				} else { //Otherwise, singleplayer
					submit_singleplayer_guess(); 
				}
			} else {
				var regex = new RegExp("^[a-zA-Z0-9 .-]+$");
				var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
				if (!regex.test(key)) {
					event.preventDefault();
				}
			}
		});

		//When the Start button is clicked
		$("#start_singleplayer").click(function() {
			if (singleplayer_available == true) { 
				socket.emit("start singleplayer", [localStorage.getItem("session")]); //Request to start Time Attack
			}
		});

		//Event listener for clicking on sign out button
		$("body").on("click", "#sign_out", function(){
			socket.emit("log out", localStorage.getItem("session")); //Tell server this client is logging out
			localStorage.setItem("session", ""); //Reset session
			window.location.replace("login"); //Open login page
		});

		socket.emit("joined game", localStorage.getItem("session")); //Tell server this client has joined the game

		//Set interval for redrawing the Pokémon image and timer bar
		window.setInterval(function(){ 
			if (mode == "multiplayer" && deadline != null) {
				let remaining_time = get_remaining_time(deadline);
				if (remaining_time > 5000) {
					draw_pokemon(pokemon_info, multiplayer_ctx, ((remaining_time - 5000) / 15000)*50); //Redraw Pokémon image with set blur amount
				} else {
					draw_pokemon(pokemon_info, multiplayer_ctx, 0); //Redraw Pokémon image with set blur amount			
				}
				$("#timer").width((remaining_time/18500 * 100)+"%"); //Set width of timer to reflect seconds remaining
			} else if (mode == "singleplayer" && singleplayer_game_deadline != null && singleplayer_question_deadline != null) { //In an active singleplayer game
				let remaining_time = get_remaining_time(singleplayer_question_deadline); //Remaining time to answer current question
				let remaining_game_time = get_remaining_time(singleplayer_game_deadline); //Time left in game
				if (remaining_time > 2500) { //Singleplayer questions are half as long
					draw_pokemon(singleplayer_pokemon_info, singleplayer_ctx, ((remaining_time - 2500) / 7500)*50); //Redraw Pokémon image with set blur amount
				} else {
					draw_pokemon(singleplayer_pokemon_info, singleplayer_ctx, 0); //Redraw Pokémon image with set blur amount			
				}
				$("#singleplayer_question_timer").width((remaining_time/10000 * 100)+"%"); //Set width of question timer to reflect seconds remaining to answer question
				$("#singleplayer_game_timer").width((remaining_game_time/60100 * 100)+"%"); //Set width of game timer to reflect seconds remaining to play game
			};
		}, 100);
	});
});