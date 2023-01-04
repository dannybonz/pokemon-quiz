import requests

pokemon={"pokemon":[]}

for x in range(1,906):
    image='https://assets.pokemon.com/assets/cms2/img/pokedex/full/'+str(x).zfill(3)+'.png'
    text=requests.get('https://www.pokemon.com/uk/pokedex/'+str(x).zfill(3)).text
    name=text.split(" | Pokédex")[0].split(">")[-1]
    print(name)
    pokemon["pokemon"].append({"name":name,"image":image})
