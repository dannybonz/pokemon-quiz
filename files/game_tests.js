suite("General tests", function() {
	test("Pokémon image set ", function() {
		let pokemon_image=$("#pokemon_image");
		chai.assert.notEqual(pokemon_image.css("background-image"), 'none', "Pokémon image not set");
	});

	test("Leaderboard populated ", function() {
		let leaderboard=$("#leaderboard_contents");
		console.log(leaderboard.html());
		chai.assert.notEqual(leaderboard.html(), '', "Leaderboard entirely empty");
	});

	test("Guess box messages visible ", function() {
		let guess_box=$("#guess_box");
		chai.assert.notEqual(guess_box.html().indexOf('Pokémon appeared'), -1, "Server message not found");
	});
});

suite("Logged out tests", function() {
	test("Signed out message displayed ", function() {
		let signed_out_display=$("#signed_out");
		chai.assert.equal(signed_out_display.css("display"), "block", "Signed out message not visible");
	});

	test("Guess entry disabled ", function() {
		let guess_entry=$("#guess_entry");
		chai.assert.equal(guess_entry.prop('disabled'), true, "Guess entry enabled");
	});

	test("Sign up message displayed in input box ", function() {
		let guess_entry=$("#guess_entry");
		chai.assert.equal(guess_entry.val(), 'Log in or register to join the game.', "Guess entry empty");
	});
});

suite("Logged in tests", function() {
	test("Signed in message displayed ", function() {
		let signed_in_display=$("#signed_in");
		chai.assert.equal(signed_in_display.css("display"), "block", "Signed in message not visible");
	});
	
	test("Guess entry enabled ", function() {
		let guess_entry=$("#guess_entry");
		chai.assert.equal(guess_entry.prop('disabled'), false, "Guess entry disabled");
	});

	test("Guess entry empty ", function() {
		let guess_entry=$("#guess_entry");
		chai.assert.equal(guess_entry.val(), '', "Guess entry empty");
	});
});