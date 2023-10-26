let express=require("express");
let http=require("http");
let path=require("path");
let socketIo=require("socket.io");
let mongoose=require("mongoose");
let User=require("./user-schema").User;
let Pokemon=require("./pokemon-schema").Pokemon;
let url="mongodb+srv://adminn:Aoijawod3509kadoczkawa49@cluster0.my31ewo.mongodb.net/pokemondb?retryWrites=true&w=majority";
let crypto=require('crypto'); 
let port=9003;
let pokemon=null; //Used to store the current question
let correct_answer=null; //Used to store the current correct answer
let all_pokemon=[]; //Used to store an array of every potential Pokémon
let sessions={}; //Used to match session cookie values to signed in accounts
let leaderboard=null; //Used to store the current leaderboard status

// Initialise the app and server.
let app=express();
let server=http.createServer(app);
// Configure to use statics.
app.use(express.static(path.join(__dirname, "files")));
// Setup the websocket.
let io=socketIo(server);
// Connect to the Mongo database using Mongoose.
mongoose.connect(url, {useUnifiedTopology:true, useNewUrlParser:true});

//Retrieve all Pokémon documents from MongoDB and add to all_pokemon array
Pokemon.find({}, function(err, output) {
	all_pokemon=output;
	refresh_pokemon(); //After retrieving all Pokémon, set the first question
	
	//Set regular interval for checking if a new question is needed
	var interval=setInterval(function() {
		let now=new Date(); //Get current time
		let time_since_epoch=now.getTime(); //Get milliseconds since epoch
		let difference=pokemon[1] - time_since_epoch; 
		remaining_time=difference; //Time left until a new question needs to be displayed if no guess is made
		
		if (pokemon[1] < now) { //If the deadline has passed without a correct guess
			io.emit("failed", correct_answer); //Tell all clients the correct answer
			refresh_pokemon(); //Set a new question
			io.emit("new pokemon", pokemon); //Tell all clients the new question
		}
	}, 100);
});

//Used to set a new Pokémon and deadline
function refresh_pokemon() {
	let chosen_pokemon=all_pokemon[Math.floor(Math.random() * all_pokemon.length)] //Select random Pokémon
	let now=new Date();
	let time_since_epoch=now.getTime(); //Get milliseconds since epoch
	let deadline=time_since_epoch + 101000; //101 seconds from now
	pokemon=[chosen_pokemon["image"], deadline];
	correct_answer=chosen_pokemon["name"]
}

//Used to update the leaderboard status
function update_leaderboard() {
	User.find({user_score:{$gt:0}}, 'user_name user_score').sort({user_score:"desc"}).exec(function(err, output) { //Find all users with scores above 0 and sort them in descending order
		leaderboard=output;
		io.emit("leaderboard", leaderboard) //Send the new leaderboard to all clients
	});
}

//Get current leaderboard status
update_leaderboard();

//Redirect to game page upon website visit/any get request
app.get("/*", function(request, response) {
	response.redirect("game.html");
});

//When a new client connects
io.on("connection", function(socket) {
	console.log("New connection");

	//This message is sent by the client when they join the game
	socket.on("joined game", function(session_var) {
		if (sessions[session_var]==undefined) { //If no session value is set for this client
			socket.emit("not logged in"); //Tell the client they're not logged in
		} else { //If the user is logged in already
			User.findOne({user_name:sessions[session_var]}).exec().then((doc) => { //Find the MongoDB doc relating to this user
				user_data=[doc.user_name, doc.user_score]; 
				socket.emit("welcome", user_data); //Login confirmed, activate input and send user data to client
			});
		}
		socket.emit("new pokemon", pokemon); //Send the current question
		socket.emit("leaderboard", leaderboard); //Send the current leaderboard
	});
	
	//This message is sent by the client when the user attempts to create an account
	socket.on("registration", function(user_data) {
		if (user_data[0].length<1) {
			socket.emit("username too short");
		} else if (user_data[1].length<1) {
			socket.emit("password too short");						
		} else { //Username and password both acceptable
			User.findOne({user_name:user_data[0]}).exec().then((doc) => { //Search MongoDB database for a user matching this username
				if (doc) { //A user with this name already exists
					socket.emit("username used");
				} else { //No user with this name exists yet
					encrypted_password=crypto.pbkdf2Sync(user_data[1], "dc0b2dd4f78221adac85386e9ee57a9047562d5", 1000, 64, `sha512`).toString(`hex`); //Encrypt password
					User.create({user_name:user_data[0], user_password:encrypted_password, user_score:0}); //Create new user doc
					socket.emit("registration successful");
				};
			});
		};
	});

	//This message is sent by the client when the user attempts to log in
	socket.on("login", function(user_data) {
		encrypted_password=crypto.pbkdf2Sync(user_data[1], "dc0b2dd4f78221adac85386e9ee57a9047562d5", 1000, 64, `sha512`).toString(`hex`); //Encrypt password
		User.findOne({user_name:user_data[0], user_password:encrypted_password}).exec().then((doc) => { //Attempt to find an account matching the given information
			if (doc) { //If a match was found
				session_var=(Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2)); //Create random string to be used as session cookie
				sessions[session_var]=user_data[0]; //Match username to newly generated session value
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
		if (sessions[msg[1]]==null) { //If user not logged in
			socket.emit("login required");
		} else { //User logged in
			if (msg[0].length>0) { //Don't send empty message
				io.emit("user guess", [msg[0], sessions[msg[1]]]); //Send guess to all other users
				if (msg[0].toLowerCase()==correct_answer.toLowerCase()) { //Check if this is the correct answer - compare in lower case to remove case sensitivity
					User.findOne({user_name:sessions[msg[1]]}).exec().then((doc) => { //Find the user who answered correctly
						User.updateOne({user_name:sessions[msg[1]]}, {user_score:doc.user_score+1}, function() { //Increase score 
							io.emit("correct", [correct_answer,sessions[msg[1]],doc.user_score+1]); //Send "correct" message to all users
							refresh_pokemon(); //Generate new question
							io.emit("new pokemon", pokemon); //Send new question to all users
							update_leaderboard();
							socket.emit("update score", [doc.user_name, doc.user_score+1]); //Send the new score to the user who guessed correctly
						});
					});
				}
			}
		}
	});
});

//Start server
server.listen(port, function() {
	console.log("Now listening on " + port);
});
