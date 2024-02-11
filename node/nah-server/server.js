import express from "express"
import { readdirSync } from "fs";
import { join, dirname, parse } from "path"
import { fileURLToPath } from 'url';

// https://stackoverflow.com/questions/8817423/why-is-dirname-not-defined-in-node-repl
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants
const SERVER_PORT = process.env.PORT || 9034
const WORKING_DIR = "public"

// In-memory store
let indexHtml = undefined
let publicFiles = undefined
let publicFilesByExt = undefined

// Helper functions
function publicPath(path) {
  if (path) {
    return join(__dirname, WORKING_DIR, path)
  }

  return join(__dirname, WORKING_DIR)
}

function normalize(string) {
  return string.toLowerCase()
}

function random(min, max) {
  return Math.round(Math.random() * (max - min) + min)
}

function shouldIgnore(path) {
  const { ext, dir, name } = parse(path)
  // Ignore any directories
  if (!ext) {
    return true
  }

  if (path === "index.html" || path === "/") {
    return true
  }

  // Ignore icons folder
  if (dir.includes("icons")) {
    return true
  }

  return false
}

function mapFilesToExt(files) {
  const extMap = {}
  // Create a map of extensions to filenames
  files.forEach(filename => {
    const { ext } = parse(filename)
    const e = normalize(ext)
    if (!extMap.hasOwnProperty(e)) {
      extMap[e] = []
    }
    extMap[e].push(filename)
  })

  return extMap
}

function listPublicFiles() {
  const publicDir = publicPath()
  const files = readdirSync(publicDir, { encoding: 'utf-8', recursive: true })
  return files.filter(f => !shouldIgnore(f))
}

function getRandomFile(path, list) {
  if (!list || list.length < 2) {
    return path
  }

  const { name: oldName } = parse(path)
  let tries = 0
  let selectedName = oldName
  let selectedPath = path

  while (tries <= 10 && selectedName === oldName) {
    const randomIndex = random(0, list.length - 1)
    const selectedFile = list[randomIndex]
    if (selectedFile) {
      const { name: newName } = parse(selectedFile)
      selectedName = newName
      selectedPath = selectedFile
    }
    tries++
  }

  return selectedPath
}

function getIconByExt(ext) {
  switch (ext) {
    case ".jpeg":
    case ".jpg":
      return "./icons/icon_image1.png"
    case ".png":
      return "./icons/icon_image2.png"
    case ".mov":
      return "./icons/icon_movie.png"
    case ".html":
      return "./icons/icon_portal.png"
    case ".mp3":
      return "./icons/icon_sound1.png"
    case ".txt":
    case ".md":
      return "./icons/icon_text.png"
    case ".pdf":
      return "./icons/icon_bomb.png"
    default:
      return "./icons/icon_icon_unknown.png"
  }
}

function generateIndexHtml(files) {
  const sortedFiles = [...files]
  // todo: sort alphabetically by file
  sortedFiles.sort()
  const tableRows = sortedFiles.map(file => {
    const { ext } = parse(file)
    return `<tr>
  <td><img src="${getIconByExt(normalize(ext))}" role="presentation"/></td>
  <td><a href="${file}">${file}</a></td>
</tr>`
  })
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Index of /nah</title>
      <style>
        html {
          background-color: pink;
          font-family: monospace;
          font-size: 1rem;
        }
        h1 {
          font-family: 'Times New Roman', Times, serif;
        }
        a {
          text-decoration: none;
        }
        table {
          padding: 5px;
        }
        td {
          padding: 5px 15px;
        }
        th {
          text-align: left;
          font-weight: normal;
          padding: 5px 15px 15px 15px;
        }
      </style>
    </head>
    <body>
      <h1>🌻 Index of /nah</h1>
      <hr />
      <table>
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Name</th>
          </tr>
        </thead>
        <tbody>
        ${tableRows.join("\n")}
        </tbody>
      </table>
    </body>
  </html>

`
}

const app = express()

app.use((_req, res, next) => {
  if (publicFiles === undefined) {
    res.send("not ready, try again later")
    return
  }

  next()
})

// Make my own random middlewhere
app.use((req, res, next) => {
  const { path } = req
  if (shouldIgnore(path)) {
    next()
    return
  }

  const { ext } = parse(path)
  const fileToSend = getRandomFile(decodeURI(path), publicFilesByExt[normalize(ext)])
  res.sendFile(publicPath(fileToSend))
  return
})

// Add a static server to "public" folder
app.use("/icons", express.static("public/icons"))

app.get('/', (req, res) => {
  if (indexHtml === undefined) {
    res.send("not ready, try again later")
  } else {
    res.send(indexHtml)
  }
})

app.listen(SERVER_PORT, () => {
  console.log(`* ~ * ~ * Server running on port ${SERVER_PORT} * ~ * ~ *`)
})

// Set up generative logic after starting app server
// Get a list of files from public directory
publicFiles = listPublicFiles()
// Map that file list by ext type for easy access
publicFilesByExt = mapFilesToExt(publicFiles)
// Create an index.html file that'll be created dynamically based on folder content
indexHtml = generateIndexHtml(publicFiles)