# Who's that Pokémon? Online Quiz Game
This game tasks players with identifying blurry images of Pokémon. As time goes on, the image becomes clearer. If a user can quickly identify a Pokémon, they'll earn extra points.

This game includes real-time multiplayer - multiple users can simultaneously compete to be the first to identify a Pokémon. As soon as one user identifies the Pokémon, a new question begins. Scored points are kept in a leaderboard allowing users to compare their victories.

# Technologies Used
Pokémon information is stored in a MongoDB database. Each Pokémon has a record for their name and associated image. This data is obtained using a scraper written in Python, with images being taken from the official Pokémon website and names being accessed via PokéAPI.
A table also stores usernames and passwords. All server communications are done using Javascript with SocketIO over secure HTTPS communication.

A live version of this project can be accessed at https://bmap.online/quiz/
