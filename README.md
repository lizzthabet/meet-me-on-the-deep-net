# meet me on the deep net (a game) ~ ~ ~ ~ ~ ~ ~

*Meet me on the deep net* is a tiny browser-based game about intimacy, trust, and establishing connection while being anonymous. The game tells the story of a person crossing an ocean to meet a stranger, where a player can choose to be either seeking or offering connection.

The journeys a player can make are inspired by how secure rendezvous points are established in the Tor network to allow websites to be visited and hosted anonymously. Using the visual language of the web, this game finds drama and wonder in the dances of request <> response that our devices make.

## local development

```sh
npm run dev
```

The main game content is all HTML, CSS, and JavaScript. To work on it locally, there's a simple HTTP server that uses a websocket connection to hot reload the browser window when the connection is severed. Nodemon watches for file changes and restarts the dev server (thus triggering the browser page reload!).
