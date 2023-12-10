const https = require("https");
const fs = require('fs');
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const User = require("./user-schema").User;
const Pokemon = require("./pokemon-schema").Pokemon;
const crypto = require('crypto'); 

//Load config
const configData = fs.readFileSync('./server_config.json', 'utf-8');
const config = JSON.parse(configData);

const port = config.port;
let pokemon = null; //Used to store the current question
let correct_answer = null; //Used to store the current correct answer
let all_pokemon = []; //Used to store an array of every potential Pokémon
let sessions = {}; //Used to match session cookie values to signed in accounts
let leaderboard = null; //Used to store the current leaderboard status
let time_attack_leaderboard = null; //Used to store the current Time Attack leaderboard status
let time_attack_games = {}; //Used to store active Time Attack games

//Define SSL certificate
const options = {
  key: fs.readFileSync(config.key),
  cert: fs.readFileSync(config.cert)
};

// Initialise the server.
const server = https.createServer(options);
const io = socketIo(server,   {
	cors: {
		origin: config.origin,
		methods: ["GET", "POST"]
	}
});

// Connect to the Mongo database using Mongoose.
const url = config.mongo_url;
mongoose.connect(url, {useUnifiedTopology:true, useNewUrlParser:true});

//Retrieve all Pokémon documents from MongoDB and add to all_pokemon array
Pokemon.find({}, function(err, output) {
	all_pokemon = output;
	refresh_pokemon(); //After retrieving all Pokémon, set the first question
	
	//Set regular interval for checking if a new question is needed
	setInterval(function() {
		let time_since_epoch = get_current_time();
		if (pokemon[1] < time_since_epoch) { //If the deadline has passed without a correct guess
			io.emit("failed", correct_answer); //Tell all clients the correct answer
			refresh_pokemon(); //Set a new question
			io.emit("new pokemon", pokemon); //Tell all clients the new question
		}
	}, 100);
});

//Used to get the current time in milliseconds since epoch
function get_current_time() {
	let now = new Date();
	let time_since_epoch = now.getTime(); //Get milliseconds since epoch
	return(time_since_epoch);
}

//Used to calculate a question deadline time, given its duration
function calculate_deadline(timespan) {
	let time_since_epoch = get_current_time();
	let deadline = time_since_epoch + timespan; //Add question timespan to current time to calculate deadline
	return (deadline);
}

//Used to generate a Pokémon object with image, answer and deadline
function generate_pokemon(timespan) {
	let deadline = calculate_deadline(timespan);
	let chosen_pokemon = all_pokemon[Math.floor(Math.random() * all_pokemon.length)] //Select random Pokémon
	return({"pokemon": [chosen_pokemon["image"], deadline], "correct_answer": chosen_pokemon["name"]});

}

//Used to set a new Pokémon and deadline
function refresh_pokemon() {
	let pokemon_object = generate_pokemon(20100) //Generate new Pokémon with deadline 21 seconds from now
	pokemon = pokemon_object["pokemon"];
	correct_answer = pokemon_object["correct_answer"];
}

function remove_all_special_characters(string) {
	return string.replace(/[^a-zA-Z0-9]/g, "")
}

function remove_special_characters(string) {
	return string.replace(/[^a-zA-Z0-9 .-]/g, "")
}

//Used to update the leaderboard status
function update_leaderboard() {
	User.find({user_score:{$gt:0}}, 'user_name user_score').sort({user_score:"desc"}).exec(function(err, output) { //Find all users with scores above 0 and sort them in descending order
		leaderboard = output;
		io.emit("leaderboard", leaderboard) //Send the new leaderboard to all clients
	});
}

function update_time_attack_leaderboard() {
	User.find({user_ta_score:{$gt:0}}, 'user_name user_ta_score').sort({user_ta_score:"desc"}).exec(function(err, output) { //Find all users with Time Attack scores above 0 and sort them in descending order
		time_attack_leaderboard = output;
		io.emit("ta leaderboard", time_attack_leaderboard) //Send the new leaderboard to all clients
	});
}

//Given a deadline, calculate how many seconds remain
function get_remaining_time(deadline) {
	let time_since_epoch = get_current_time();
	let difference = deadline - time_since_epoch; 
	remaining_time = difference; //Time left until a new question needs to be displayed if no guess is made
	return(remaining_time);
}

//Get current leaderboard statuses
update_leaderboard();
update_time_attack_leaderboard();

//When a new client connects
io.on("connection", function(socket) {
	console.log("New connection");

	//This message is sent by the client when they join the game
	socket.on("joined game", function(session_var) {
		if (sessions[session_var] == undefined) { //If no session value is set for this client
			socket.emit("not logged in"); //Tell the client they're not logged in
			socket.emit("leaderboard", leaderboard); //Send the current multiplayer leaderboard
			socket.emit("ta leaderboard", time_attack_leaderboard); //Send the current Time Attack leaderboard
		} else { //If the user is logged in already
			User.findOne({user_name:sessions[session_var]}).exec().then((doc) => { //Find the MongoDB doc relating to this user
				user_data = [doc.user_name, doc.user_score, leaderboard, time_attack_leaderboard]; 
				socket.emit("welcome", user_data); //Login confirmed, activate input and send user data to client
			});
		}
		socket.emit("new pokemon", pokemon); //Send the current question
	});
	
	//This message is sent by the client when the user attempts to create an account
	socket.on("registration", function(user_data) {
		if (user_data[0].length < 1) {
			socket.emit("username too short");
		} else if (user_data[0].length > 10) {
			socket.emit("username too long");
		} else if (user_data[1].length < 1) {
			socket.emit("password too short");						
		} else if (user_data[1].length > 20) {
			socket.emit("password too long");						
		} else { //Username and password both acceptable
			User.findOne({user_name:user_data[0]}).exec().then((doc) => { //Search MongoDB database for a user matching this username
				if (doc) { //A user with this name already exists
					socket.emit("username used");
				} else { //No user with this name exists yet
					encrypted_password = crypto.pbkdf2Sync(user_data[1], "dr0r7MRwjCi2n7KKvHstjRimG7ROFP38i2n7KKvH", 1000, 64, `sha512`).toString(`hex`); //Encrypt password
					User.create({user_name:user_data[0], user_password:encrypted_password, user_score:0, user_ta_score:0}); //Create new user doc
					socket.emit("registration successful");
				};
			});
		};
	});

	//This message is sent by the client when the user attempts to log in
	socket.on("login", function(user_data) {
		encrypted_password = crypto.pbkdf2Sync(user_data[1], "dr0r7MRwjCi2n7KKvHstjRimG7ROFP38i2n7KKvH", 1000, 64, `sha512`).toString(`hex`); //Encrypt password
		User.findOne({user_name:user_data[0], user_password:encrypted_password}).exec().then((doc) => { //Attempt to find an account matching the given information
			if (doc) { //If a match was found
				session_var = (Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)); //Create random string to be used as session cookie
				sessions[session_var] = user_data[0]; //Match username to newly generated session value
				socket.emit("login successful",session_var);
			} else { //If a match wasn't found
				socket.emit("login failed");
			}
		})
	});

	//This message is sent by the client when the user logs out
	socket.on("log out", function(session_var) {
		delete sessions[session_var]; //Delete session variable, ending their session
	});

	//This message is sent by the client when sending a guess
	socket.on("sent guess", function(msg) {
		if (sessions[msg[1]] == null) { //If user not logged in
			socket.emit("login required");
		} else { //User logged in
			if (msg[0].length > 0 && msg[0].length <= 15) { //Don't send empty message or exceedingly long message
				if (remove_all_special_characters(msg[0].toLowerCase()) == remove_all_special_characters(correct_answer.toLowerCase())) { //Check if this is the correct answer - compare in lower case without special characters
					//Calculate score based on answer speed
					let remaining_time = get_remaining_time(pokemon[1]);
					let score = 1;
					if (remaining_time > 18000) {
						score = 5;
					} else if (remaining_time > 15000) {
						score = 3;
					}
					User.findOne({user_name:sessions[msg[1]]}).exec().then((doc) => { //Find the user who answered correctly
						User.updateOne({user_name:sessions[msg[1]]}, {user_score:doc.user_score+score}, function() { //Increase score 
							io.emit("correct", [correct_answer,sessions[msg[1]],doc.user_score+score,score]); //Send "correct" message to all users
							refresh_pokemon(); //Generate new question
							io.emit("new pokemon", pokemon); //Send new question to all users
							update_leaderboard();
							socket.emit("update score", [doc.user_name, doc.user_score+score]); //Send the new score to the user who guessed correctly
						});
					});
				} else {
					io.emit("user guess", [msg[0], remove_special_characters(sessions[msg[1]])]); //Send guess to all other users
				}
			}
		}
	});

	//Replaces the current Time Attack question for the given user, returning the Pokémon object
	function refresh_ta_pokemon(session_var) {
		let pokemon_object = generate_pokemon(10600); //Singleplayer questions end quicker
		time_attack_games[session_var]["question_deadline"] = pokemon_object.pokemon[1];
		time_attack_games[session_var]["correct_answer"] = pokemon_object.correct_answer;
		return (pokemon_object);
	}

	//This message is sent by the client when sending a guess in Time Attack mode
	socket.on("singleplayer guess", function(msg) {
		if (sessions[msg[1]] == null) { //If user not logged in
			socket.emit("login required");
		} else if ((msg[1] in time_attack_games) && (time_attack_games[msg[1]].game_deadline > get_current_time())) { //User logged in and a Time Attack game is active
			if (msg[0].length > 0 && msg[0].length <= 15) { //Don't send empty message or exceedingly long message
				if (remove_all_special_characters(msg[0].toLowerCase()) == remove_all_special_characters(time_attack_games[msg[1]].correct_answer.toLowerCase())) { //Check if this is the correct answer - compare in lower case without special characters
					let remaining_time = get_remaining_time(time_attack_games[msg[1]].question_deadline);
					let score = 1;
					let bonus_time = 0;
					console.log(remaining_time);
					if (remaining_time > 9000) {
						score = 5;
						bonus_time = 3;
					} else if (remaining_time > 7500) {
						score = 3;
						bonus_time = 2;
					} else if (remaining_time > 5000) {
						score = 2;
						bonus_time = 1;
					}
					time_attack_games[msg[1]].score += score;
					time_attack_games[msg[1]].game_deadline += bonus_time * 1000;
					if (get_remaining_time(time_attack_games[msg[1]].game_deadline) > 60000) { //If overfilled the timer bar
						time_attack_games[msg[1]].game_deadline = get_current_time() + 60000; //Revert to max
					}
					User.findOne({user_name:sessions[msg[1]]}).exec().then((doc) => { //Find the user who answered correctly
						let personal_best = doc.user_ta_score;
						if (time_attack_games[msg[1]].score > personal_best) { //If this is a new high score for this user
							personal_best = time_attack_games[msg[1]].score;
							User.updateOne({user_name:sessions[msg[1]]}, {user_ta_score:time_attack_games[msg[1]].score}, function() { //Update stored high score 
								update_time_attack_leaderboard(); //Update Time Attack leaderboard
							});
						};
						socket.emit("singleplayer correct", [time_attack_games[msg[1]].correct_answer,sessions[msg[1]],time_attack_games[msg[1]].score,score,bonus_time,personal_best,time_attack_games[msg[1]].game_deadline]); //Tell user they were correct, including information on their current score, best score and remaining game time
						let pokemon_object = refresh_ta_pokemon(session_var); //Generate new question
						socket.emit("singleplayer pokemon", pokemon_object["pokemon"]); //Tell client about the new question		
					});
				} else { //Incorrect answer
					socket.emit("singleplayer guess", [msg[0], remove_special_characters(sessions[msg[1]])]); //Send guess back to user
				}
			}
		}
	});

	//This message is sent by the client when starting a Time Attack game
	socket.on("start singleplayer", function(session_var) {
		if (sessions[session_var] == null)  { //If user not logged in
			socket.emit("login required");
		} else { //User logged in
			User.findOne({user_name:sessions[session_var]}).exec().then((doc) => { //Find the doc correlating to the signed in user
				if (session_var in time_attack_games) { //If already started a game
					clearInterval(time_attack_games[session_var].loop); //Stop current game loop
					delete time_attack_games[session_var]; //Delete current game so that a new game may begin
				}
				let game_deadline = calculate_deadline(60100)
				socket.emit("start singleplayer", [game_deadline, doc.user_ta_score]); //Send the user the deadline for their singleplayer game along with their current best
				time_attack_games[session_var] = {"score": 0, "correct_answer": null, "question_deadline": null, "game_deadline": game_deadline, "loop": null, "socket": socket}
				time_attack_games[session_var].loop = setInterval(function() {
					let time_since_epoch = get_current_time();
					if (time_attack_games[session_var]["question_deadline"] < time_since_epoch) { //If the question deadline has passed without a correct guess
						if (time_attack_games[session_var].correct_answer != null) { //If a question has gone unanswered
							socket.emit("singleplayer failed", time_attack_games[session_var].correct_answer); //Tell all clients the correct answer
						}
						let pokemon_object = refresh_ta_pokemon(session_var);
						socket.emit("singleplayer pokemon", pokemon_object["pokemon"]); //Tell client about the new question
					} else if (time_attack_games[session_var]["game_deadline"] < time_since_epoch) { //If the game deadline has passed
						socket.emit("end singleplayer", time_attack_games[session_var].score);
						clearInterval(time_attack_games[session_var].loop);
						socket.emit("ta leaderboard", time_attack_leaderboard); //Send the new Time Attack leaderboard
					}
				}, 100);
			});
		}
	});
});

//Start server
server.listen(port, function() {
	console.log("Now listening on " + port);
});
