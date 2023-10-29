$(function() {
	//Connect socket
	let socket = io("server");

	$("#register").click(function() {
		socket.emit("registration", [$("#registration_username").val(),$("#registration_password").val()]);
	})

	$("#login").click(function() {
		socket.emit("login", [$("#username").val(),$("#password").val()]);
	})

	//Received after attempting to register an account with a username that already exists
	socket.on("username used", function() {
		$("#register-error").html("This username is already in use.");
	});

	//Received after successfully creating an account
	socket.on("registration successful", function() {
		$("#register-error").html("Your account has now been succesfully created! Log in to continue.");
	});

	//Received after attempting to log into an account with incorrect credentials
	socket.on("login failed", function() {
		$("#login-error").html("That username or password combination doesn't exist.");
	});

	//Received after attempting to register an account with a username that is too short
	socket.on("username too short", function() {
		$("#register-error").html("The provided username is too short.");
	});

	//Received after attempting to register an account with a username that is too long
	socket.on("username too long", function() {
		$("#register-error").html("The provided username is too long.");
	});

	//Received after attempting to register an account with a password that is too short
	socket.on("password too short", function() {
		$("#register-error").html("The provided password is too short.");
	});

	//Received after attempting to register an account with a password that is too long
	socket.on("password too short", function() {
		$("#register-error").html("The provided password is too long.");
	});

	//Received after succesfully logging in
	socket.on("login successful", function(session) {
		localStorage.setItem("session", session) //Store provided session value
		window.location.replace("index"); //Redirect to game page
	});
});

