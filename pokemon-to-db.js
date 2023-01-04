let fs = require("fs");
let mongoose = require("mongoose");
let Pokemon = require("./pokemon-schema").Pokemon;

// Read the data.
let data = fs.readFileSync("pokemon.json");
data = JSON.parse(data);

// Connect to the database.
let url = "mongodb+srv://adminn:alienalien@cluster0.my31ewo.mongodb.net/pokemondb?retryWrites=true&w=majority";
mongoose.connect(url, {useUnifiedTopology: true, useNewUrlParser: true});

// Call the insertMany method to insert all of the JSON data in one go.
Pokemon.collection.insertMany(data["pokemon"], function(err, result) {
	
	// Error handling...
	if (err) console.log(err);
	
	// If all was successful, print out how many documents were added to
	// the database and close the connection.
	console.log(result.insertedCount + " docs inserted");
	mongoose.connection.close();
	console.log("DB connection closed");
});