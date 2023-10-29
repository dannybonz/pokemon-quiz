import requests

pokemon={"pokemon":[]}

for x in range(1,1011): #Loop through dex numbers 
    image='https://assets.pokemon.com/assets/cms2/img/pokedex/full/'+str(x).zfill(3)+'.png' #Get image from Pokémon website
    text=requests.get('https://pokeapi.co/api/v2/pokemon-species/'+str(x)).text #Get text info from PokeApi
    name=text.split(',{"language":{"name":"en","url":"https://pokeapi.co/api/v2/language/9/"},"name":"')[1].split('"')[0] #Extract Pokémon name
    pokemon["pokemon"].append({"name":name,"image":image}) #Add Pokémon to pokemon dict

#Save the output of pokemon to pokemon.json and run "pokemon_to_db.js" to add data to database
