import requests, json

def download_image(url, destination): #Downloads image from given URL to given destination
    response=requests.get(url, stream=True)
    if response.status_code==200: #Success
        with open(destination, 'wb') as file:
            for chunk in response.iter_content(chunk_size=1024):
                file.write(chunk)
        print("Image downloaded successfully.")
    else:
        print("Failed to download image. Status code: "+str(response.status_code))

pokemon={"pokemon":[]} #Pokémon dictionary

for x in range(1,1011):
    image='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+str(x)+'.png' #Get image from PokeAPI
    download_image(image, "images/"+str(x)+".png")
    text=requests.get('https://pokeapi.co/api/v2/pokemon-species/'+str(x)).text
    name=text.split(',{"language":{"name":"en","url":"https://pokeapi.co/api/v2/language/9/"},"name":"')[1].split('"')[0]
    pokemon["pokemon"].append({"name":name,"image":str(x)+".png"})
    print(name + "added.")

#Use the generated dictionary to create a JSON file
with open('pokemon.json', 'w') as fp:
    json.dump(pokemon, fp)
