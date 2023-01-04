let mongoose = require("mongoose");

let pokemon_schema = new mongoose.Schema({
	name: String,
	image: String
}, {collection: "pokemon"});

let Pokemon = mongoose.model("pokemon", pokemon_schema);

module.exports.Pokemon = Pokemon;