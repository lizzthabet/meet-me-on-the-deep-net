# meet me on the deep net (a game) ~ ~ ~ ~ ~ ~ ~

*Meet me on the deep net* is a tiny browser-based game about intimacy, trust, and establishing connection while being anonymous. The game tells the story of a person crossing an ocean to meet a stranger, where a player can choose to be either seeking or offering connection.

The journeys a player can make are inspired by how secure rendezvous points are established in the Tor network to allow websites to be visited and hosted anonymously. Using the visual language of the web, this game finds drama and wonder in the dances of request <> response that our devices make.

The game is hosted through Netlify and set up with automatic deployments, while the game epilogue is self-hosted using Tor.

## local development

```sh
npm run dev -w game
```

The main game content is all HTML, CSS, and JavaScript. To work on it locally, there's a simple HTTP server that uses a websocket connection to hot reload the browser window when the connection is severed. Nodemon watches for file changes and restarts the dev server (thus triggering the browser page reload!).

## a communal landscape (game epilogue)

After playing the game, people are invited to put the protocol into practice by visiting a website with Tor. Their browsers will perform the elaborate dance to establish secure, anonymous connection with website server running on a tiny computer in my house. On this self-hosted site, they'll find a collaborative landscape full of islands and waves that they can explore and contribute to. Here, players / travelers can leave an island behind for a future stranger to visit. :)

### local development

The collaborative landscape uses the same code and interactions as the game, with the addition of a backend web server that saves and retrieves the data that makes up the collaborative landscape.

To run this site locally, you'll need to create a `landscape.json` and `landscape-removed.json` file in the `epilogue/test` folder. The backend server won't create these if it doesn't find them.

You'll also want to set up an `.env.local` file in the `epilogue` folder with these values:
```env
NODE_ENV="development"
ASSETS_DIR="./epilogue/public"
DATA_DIR="./epilogue/test"
```

To run the backend server with hot reloading for `.ts` files:
```sh
npm run dev-server -w landscape
```

To run the frontend site with hot reloading for `/public` files:
```sh
npm run dev-site -w landscape
```
Note: outside of local development, the backend server is responsible for serving up static assets in `epilogue/public`.
