// Map movie names to their slugs on ghibli.jp/works/
const movieSlugMap: Record<string, string> = {
  // 1984
  "Nausicaä of the Valley of the Wind": "nausicaa",
  "Nausicaa of the Valley of the Wind": "nausicaa",

  // 1986
  "Laputa - Castle in the Sky": "laputa",
  "Castle in the Sky": "laputa",

  // 1988
  "My Neighbor Totoro": "totoro",
  "My Neighbour Totoro": "totoro",
  "Grave of the Fireflies": "hotaru",

  // 1989
  "Kiki's Delivery Service": "majo",
  "Kikis Delivery Service": "majo",

  // 1991
  "Only Yesterday": "omoide",

  // 1992
  "Porco Rosso": "porco",

  // 1994
  "Pom Poko": "tanuki",

  // 1995
  "Whisper of the Heart": "mimi",

  // 1997
  "Princess Mononoke": "mononoke",

  // 1999
  "My Neighbors the Yamadas": "yamada",

  // 2001
  "Spirited Away": "chihiro",

  // 2002
  "The Cat Returns": "baron",

  // 2004
  "Howl's Moving Castle": "howl",
  "Howls Moving Castle": "howl",

  // 2006
  "Tales from Earthsea": "ged",

  // 2008
  "Ponyo": "ponyo",
  "Ponyo on the Cliff by the Sea": "ponyo",

  // 2010
  "Arrietty": "karigurashi",
  "The Secret World of Arrietty": "karigurashi",

  // 2011
  "From Up on Poppy Hill": "kokurikozaka",

  // 2013
  "The Wind Rises": "kazetachinu",
  "The Tale of the Princess Kaguya": "kaguyahime",

  // 2014
  "When Marnie Was There": "marnie",

  // 2016
  "The Red Turtle": "redturtle",

  // 2020
  "Earwig and the Witch": "aya",

  // 2023
  "The Boy and the Heron": "kimitachi",
};

export function getMovieSlug(movieName: string): string {
  // Try exact match first
  if (movieSlugMap[movieName]) {
    return movieSlugMap[movieName];
  }

  // Try case-insensitive match
  const lowerName = movieName.toLowerCase();
  for (const [key, slug] of Object.entries(movieSlugMap)) {
    if (key.toLowerCase() === lowerName) {
      return slug;
    }
  }

  // Try partial match
  for (const [key, slug] of Object.entries(movieSlugMap)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return slug;
    }
  }

  // Fallback: create slug from movie name
  return movieName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getGhibliUrl(movieSlug: string): string {
  return `https://www.ghibli.jp/works/${movieSlug}/`;
}
