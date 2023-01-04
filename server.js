let express = require("express");
let http = require("http");
let path = require("path");
let socketIo = require("socket.io");
let mongoose = require("mongoose");
let User = require("./user-schema").User;
let Pokemon = require("./pokemon-schema").Pokemon;
let url = "mongodb+srv://adminn:alienalien@cluster0.my31ewo.mongodb.net/pokemondb?retryWrites=true&w=majority";
let port = 9000;
let pokemon = null;
let correct_answer = null;
let all_pokemon = [];
let sessions = {};
let leaderboard = null;

// Initialise the app and server.
let app = express();
let server = http.createServer(app);

// Setup the websocket.
let io = socketIo(server);

// Connect to the Mongo database using Mongoose.
mongoose.connect(url, {useUnifiedTopology: true, useNewUrlParser: true});
Pokemon.find({}, function(err, output) {
	all_pokemon = output;
	refresh_pokemon();
	
	//Set regular interval for updating Pokémon
	var interval = setInterval(function() {
		let now = new Date();
		let time_since_epoch = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
		let difference = pokemon[1] - time_since_epoch;
		remaining_time = difference;
		
		if (pokemon[1] < now) { //If the deadline has passed without a correct guess
			console.log("the answer is "+correct_answer);
			io.emit("failed", correct_answer);
			refresh_pokemon();
			io.emit("new pokemon", pokemon);
		}
	}, 100);
});

// Configure to use statics.
app.use(express.static(path.join(__dirname, "files")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//Used to set a new Pokémon and deadline
function refresh_pokemon() {
	let chosen_pokemon = all_pokemon[Math.floor(Math.random() * all_pokemon.length)]
	let now = new Date();
	let time_since_epoch = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
	let deadline = time_since_epoch + 101000;
	pokemon = [chosen_pokemon["image"], deadline];	
	correct_answer = chosen_pokemon["name"]
}

function update_leaderboard() {
	User.find({user_score:{$gt: 1}}, 'user_name user_score').sort({user_score : "desc"}).exec(function(err, output) {
		leaderboard = output;
		io.emit("leaderboard", leaderboard) //Send the new leaderboard to everyone
	});
}

update_leaderboard();

//Testing feature
app.get("/hello", function(request, response) {
	response.send("Hello World");
});

io.on("connection", function(socket) {
	console.log("New connection");
	
	socket.on("joined game", function(session_var) {
		if (sessions[session_var]==undefined) {
			socket.emit("not logged in");
		} else {
			socket.emit("welcome", sessions[session_var]); //Login confirmed, activate input		
		}
		socket.emit("new pokemon", pokemon); //Send the current question
		socket.emit("leaderboard", leaderboard); //Send the current leaderboard
	})
	
	socket.on("registration", function(user_data) {
		User.findOne({ user_name : user_data[0] }).exec().then((doc) => {
			if (doc) { //A user with this name already exists
				socket.emit("username used");
			} else { //No user with this name exists yet
				User.create({ user_name : user_data[0], user_password : user_data[1], user_score : 0 });
				socket.emit("registration successful");
			}
		})
	});

	socket.on("login", function(user_data) {
		User.findOne({ user_name : user_data[0], user_password : user_data[1] }).exec().then((doc) => {
			if (doc) {
				session_var = Math.random().toString(16).slice(2);
				sessions[session_var]=user_data[0];
				socket.emit("login successful",session_var);
				console.log("logged in");
			} else {
				socket.emit("login failed");
			}
		})
	});

	socket.on("sent message", function(msg) {
		// Send message to all other users
		console.log("Message received");
		io.emit("received message", [msg[0], sessions[msg[1]]]);
		if (msg[0].toLowerCase()==correct_answer.toLowerCase()) {
			User.findOne({user_name : sessions[msg[1]]}).exec().then((doc) => {
				User.updateOne({ user_name: sessions[msg[1]] }, { user_score: doc.user_score+1 }, function() {
					io.emit("correct", [correct_answer,sessions[msg[1]],doc.user_score+1]);
					refresh_pokemon();
					io.emit("new pokemon", pokemon);
					update_leaderboard();
				});
			});
		}
	});
});

server.listen(port, function() {
	console.log("Now listening on " + port);
});
