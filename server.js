let express = require("express");
let http = require("http");
let path = require("path");
let socketIo = require("socket.io");
let mongoose = require("mongoose");
let Pokemon = require("./pokemon-schema").Pokemon;
let url = "mongodb+srv://adminn:alienalien@cluster0.my31ewo.mongodb.net/pokemondb?retryWrites=true&w=majority";
let port = 9000;
let pokemon = null;
let correct_answer = null;
let all_pokemon = [];

// Initialise the app and server.
let app = express();
let server = http.createServer(app);

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

//Testing feature
app.get("/hello", function(request, response) {
	response.send("Hello World");
});

// Setup the websocket.
let io = socketIo(server);

io.on("connection", function(socket) {
	//Emit the current question to newly connected users
	socket.emit("new pokemon", pokemon);
	console.log("New user connection");

	socket.on("sent message", function(msg) {
		// Send message to all other users
		console.log("Message received");
		io.emit("received message", msg);
		if (msg[0]==correct_answer) {
			io.emit("correct", correct_answer);
			refresh_pokemon();
			io.emit("new pokemon", pokemon);
		}
	});
});

server.listen(port, function() {
	console.log("Now listening on " + port);
});
