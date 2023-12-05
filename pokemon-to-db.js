let fs = require("fs");
let mongoose = require("mongoose");
let Pokemon = require("./pokemon-schema").Pokemon;

// Read the data.
let data = fs.readFileSync("pokemon.json");
data = JSON.parse(data);

// Connect to the database.
let url = "mongodb+srv://admin:password@database.mongodb.net/pokemondb?retryWrites=true&w=majority";
mongoose.connect(url, {useUnifiedTopology: true, useNewUrlParser: true});

// Delete all documents in the collection before inserting new data.
Pokemon.collection.deleteMany({}, function(err, result) {
    if (err) {
        console.log(err);
        mongoose.connection.close();
        console.log("DB connection closed");
    } else {
        console.log(result.deletedCount + " docs deleted");

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
    }
});