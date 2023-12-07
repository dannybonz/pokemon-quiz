let mongoose = require("mongoose");

let user_schema = new mongoose.Schema({
	user_name: String,
	user_password: String,
	user_score: Number,
	user_ta_score: Number
}, {collection: "users"});

let User = mongoose.model("user", user_schema);

module.exports.User = User;