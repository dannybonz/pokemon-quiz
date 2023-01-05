$(function() {
	//Connect socket
	let socket = io("http://localhost:9000");

	$("#register").click(function() {
		socket.emit("registration", [$("#user_name").val(),$("#user_password").val()]);
	})

	$("#login").click(function() {
		socket.emit("login", [$("#login_name").val(),$("#login_password").val()]);
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

	//Received after attempting to register an account with a password that is too short
	socket.on("password too short", function() {
		$("#register-error").html("The provided password is too short.");
	});

	//Received after succesfully logging in
	socket.on("login successful", function(session) {
		document.cookie = session; //Store provided session value in a cookie
		window.location.replace("game.html"); //Redirect to game page
	});
});

