$(function() {

	let socket = io("http://localhost:9000");

	$("#register").click(function() {
		socket.emit("registration", [$("#user_name").val(),$("#user_password").val()]);
	})

	$("#login").click(function() {
		socket.emit("login", [$("#login_name").val(),$("#login_password").val()]);
	})
		
	socket.on("username used", function() {
		$("#register-error").html("This username is already in use.");
	});

	socket.on("registration successful", function() {
		$("#register-error").html("success!");
	});

	socket.on("login failed", function() {
		$("#login-error").html("Failure - that username or password combination doesn't exist.");
	});

	socket.on("login successful", function(session) {
		document.cookie = session;
		window.location.replace("game.html");
	});

});

