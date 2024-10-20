import { async } from 'regenerator-runtime';
import { API_URL, RES_PER_PAGE, KEY } from './config.js';
// import { getJSON, sendJSON } from './helpers.js';
import { AJAX } from './helpers.js';

export const state = {
  recipe: {},
  search: {
    query: '',
    results: [],
    page: 1,
    resultsPerPage: RES_PER_PAGE,
  },
  bookmarks: [],
};

const createRecipeObject = function (data) {
  const { recipe } = data.data;
  return {
    id: recipe.id,
    title: recipe.title,
    publisher: recipe.publisher,
    sourceUrl: recipe.source_url,
    image: recipe.image_url,
    servings: recipe.servings,
    cookingTime: recipe.cooking_time,
    ingredients: recipe.ingredients,
    ...(recipe.key && { key: recipe.key }),
  };
};

/*
Función: loadRecipe

1. Hace la peticion a la API de recetecas mockeadas, estas peticiones se hacen por el id y por un key que esepera el servicio

2. Una vez obtenida la data de la API, se transforma esta data a travez del mapper createRecipeObject, esto se hace
   con la finalidad de transformar el objecto a la estrucutra de data esperada en la aplicación, una vez transformada, se 
   agrega al "state" general de la aplicación, en su propuedad receipe, para ser usada más adelante

3. En el siguiente paso, lo que se busca hacer, es validar si la receta fué agregada previamente a los bookmarked, si si fué agregada, 
   se cambia el enciente el flag "bookmarked", caso contrario, se mantiene apagada. Este flag nos ayudará mas adelante para controlar
   la logica de agregado / no agregado de esto componente "Bookmarked" en la receta
*/
export const loadRecipe = async function (id) {
  try {
    const data = await AJAX(`${API_URL}${id}?key=${KEY}`);
    state.recipe = createRecipeObject(data);

    if (state.bookmarks.some(bookmark => bookmark.id === id))
      state.recipe.bookmarked = true;
    else state.recipe.bookmarked = false;

    console.log(state.recipe);
  } catch (err) {
    // Temp error handling
    console.error(`${err} 💥💥💥💥`);
    throw err;
  }
};

/*
Función: loadSearchResults

1. Se obtiene el "query" recibido por parametros, este query contiene la información añadida por el usuario en el campo de busqueda (.search__field) de la 
   aplicación, una vez obtenido, se "setea" este valor, al "state" general de la aplicación en su propiedad "search.query"

2. Una vez obtenido el query, se hace una petición AJAX al servicio dummy usado, esto se hace pasando dos parametros "GET", el primero es el key para poder
   identificarnos en el servicio, y el segundo parametro sería el query previamente obtenido, de esta forma el Endpoint, sabrá que estamos tratando de buscar

3. Después de haber obtenido la data del servicio, se mapea esta data, para usar el formato esperado en la aplicación, para despues ser agregada 
   al state, en su propiedad "search.results", indicando a su vez en la propiedad "search.page",que estamos en la página 1
*/
export const loadSearchResults = async function (query) {
  try {
    state.search.query = query;

    const data = await AJAX(`${API_URL}?search=${query}&key=${KEY}`);
    console.log(data);

    state.search.results = data.data.recipes.map(rec => {
      return {
        id: rec.id,
        title: rec.title,
        publisher: rec.publisher,
        image: rec.image_url,
        ...(rec.key && { key: rec.key }),
      };
    });
    state.search.page = 1;
  } catch (err) {
    console.error(`${err} 💥💥💥💥`);
    throw err;
  }
};

export const getSearchResultsPage = function (page = state.search.page) {
  state.search.page = page;

  const start = (page - 1) * state.search.resultsPerPage; // 0
  const end = page * state.search.resultsPerPage; // 9

  return state.search.results.slice(start, end);
};

export const updateServings = function (newServings) {
  state.recipe.ingredients.forEach(ing => {
    ing.quantity = (ing.quantity * newServings) / state.recipe.servings;
    // newQt = oldQt * newServings / oldServings // 2 * 8 / 4 = 4
  });

  state.recipe.servings = newServings;
};

const persistBookmarks = function () {
  localStorage.setItem('bookmarks', JSON.stringify(state.bookmarks));
};

export const addBookmark = function (recipe) {
  // Add bookmark
  state.bookmarks.push(recipe);

  // Mark current recipe as bookmarked
  if (recipe.id === state.recipe.id) state.recipe.bookmarked = true;

  persistBookmarks();
};

export const deleteBookmark = function (id) {
  // Delete bookmark
  const index = state.bookmarks.findIndex(el => el.id === id);
  state.bookmarks.splice(index, 1);

  // Mark current recipe as NOT bookmarked
  if (id === state.recipe.id) state.recipe.bookmarked = false;

  persistBookmarks();
};

const init = function () {
  const storage = localStorage.getItem('bookmarks');
  if (storage) state.bookmarks = JSON.parse(storage);
};
init();

const clearBookmarks = function () {
  localStorage.clear('bookmarks');
};
// clearBookmarks();

export const uploadRecipe = async function (newRecipe) {
  try {
    const ingredients = Object.entries(newRecipe)
      .filter(entry => entry[0].startsWith('ingredient') && entry[1] !== '')
      .map(ing => {
        const ingArr = ing[1].split(',').map(el => el.trim());
        // const ingArr = ing[1].replaceAll(' ', '').split(',');
        if (ingArr.length !== 3)
          throw new Error(
            'Wrong ingredient fromat! Please use the correct format :)'
          );

        const [quantity, unit, description] = ingArr;

        return { quantity: quantity ? +quantity : null, unit, description };
      });

    const recipe = {
      title: newRecipe.title,
      source_url: newRecipe.sourceUrl,
      image_url: newRecipe.image,
      publisher: newRecipe.publisher,
      cooking_time: +newRecipe.cookingTime,
      servings: +newRecipe.servings,
      ingredients,
    };

    const data = await AJAX(`${API_URL}?key=${KEY}`, recipe);
    state.recipe = createRecipeObject(data);
    addBookmark(state.recipe);
  } catch (err) {
    throw err;
  }
};
