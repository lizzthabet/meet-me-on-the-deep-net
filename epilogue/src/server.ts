import { App } from '@tinyhttp/app'
import { readFile, writeFile } from 'fs'
import { json } from 'milliparsec'
import { resolve } from 'path'
import sirv from 'sirv'
import cron from 'node-cron'

/** Types */

type LandscapePoint = {
  position: {
    startX: number,
    startY: number,
    endX?: number,
    endY?: number
  }
  color: string
}

type LandscapeList = LandscapePoint[]

type LandscapeData = {
  [key: string]: LandscapePoint
}

type RemovedLandscapeData = {
  [key: string]: LandscapeList
}

/** Constants */

const NODE_ENV = process.env.NODE_ENV || "production"
const PORT = parseInt(process.env.PORT, 10) || 4000
const ASSETS_DIR = process.env.ASSETS_DIR || "public"
const DATA_DIR = process.env.DATA_DIR || "."
const DATA_FILE = "landscape_test.json"
const DATA_REMOVED_FILE = "landscape_test-removed.json"

const isDev = NODE_ENV !== "production"

/** In-memory cache */
const landscapeCache: LandscapeData = {}
let lastCacheUpdate: number = 0
let lastFileWrite: number = 0
const removedLandscapeCache: RemovedLandscapeData = {}
let lastRemovedCacheUpdate: number = 0
let lastRemovedFileWrite: number = 0

/** Helpers */
function hash(point: LandscapePoint): string {
  let h = `${point.position.startX},${point.position.startY}`
  if (typeof point.position.endX === 'number' || typeof point.position.endY === 'number') {
    h += `${point.position.endX ?? ''},${point.position.endY ?? ''}`
  }

  return h
}

function readFileData<T>(dataPath: string, dataValidator: (data: unknown) => data is T): Promise<T> {
  return new Promise((resolve, reject) => {
    console.log("> > . reading landscape data")
    readFile(dataPath, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        reject(err)
      }
      // TODO: Consider using an async JSON parsing library for performance
      try {
        const fileJson = JSON.parse(data)
        // TODO: Consider adding a specific validation error message
        if (!dataValidator(fileJson)) {
          throw new Error("json data does not conform to expected format")
        }
        resolve(fileJson)
      } catch (err) {
        console.error("read landscape data", err)
        reject(err)
      }
  } )
  })
}

function writeLandscapeData(data: LandscapeData, dataPath: string): Promise<void> {
  // TODO: Consider adding a file lock to prevent duplicate writes
  return new Promise((resolve, reject) => {
    console.log("> > . writing landscape data")
    try {
      const fileString = JSON.stringify(data)
      writeFile(dataPath, fileString, { encoding: 'utf-8' }, (err) => {
        if (err) {
          console.error("write new landscape", err)
          reject(err)
        } else {
          lastFileWrite = Date.now()
          resolve()
        }
      })
    } catch (err) {
      console.error("landscape cache is not valid", err)
      reject(err)
    }
  })
}

function isLandscapePosition(data: unknown): data is {
  startX: number,
  startY: number,
  endX?: number,
  endY?: number
} {
  if (typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  if (Object.keys(data).length < 2 || Object.keys(data).length > 4) {
    return false
  }

  if (!Object.values(data).every((v) => typeof v === 'number')) {
    return false
  }

  if (
    !Object.prototype.hasOwnProperty.call(data, "startX")
    && !Object.prototype.hasOwnProperty.call(data, "startY")
  ) {
    return false
  }

  return true
}

function isLandscapePoint(data: unknown): data is LandscapePoint {
  if (!Object.prototype.hasOwnProperty.call(data, "position")) {
    return false
  }
  if (!Object.prototype.hasOwnProperty.call(data, "color")) {
    return false
  }

  if (Object.keys(data).length !== 2) {
    return false
  }

  // This is safe to assume because of the previous checks
  if (typeof (data as { color: unknown }).color !== 'string') {
    return false
  }

  // This is safe to assume because of the previous checks
  if (typeof (data as { position: unknown }).position !== 'object') {
    return false
  }

  if (!isLandscapePosition((data as { position: unknown }).position)) {
    return false
  }

  return true
}

function isActiveLandscape(data: unknown): data is LandscapeData {
  // Check that data is an object
  if (typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  const maybeLandscapePoints = Object.values(data)
  // Check that all object values are points
  return maybeLandscapePoints.every(isLandscapePoint)
}

function isArchivedLandscape(data: unknown): data is RemovedLandscapeData {
  // Check that data is an object
  if (typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  // Check that all object values are lists of points
  const maybeLandscapePoints = Object.values(data)
  for (let i = 0; i < maybeLandscapePoints.length; i++) {
    const maybePoints = maybeLandscapePoints[i]
    if (!Array.isArray(maybePoints)) {
      return false
    }

    if (!maybePoints.every(isLandscapePoint)) {
      return false
    }
  }

  return true
}

/** App routes */

const app = new App()
const assets = sirv(ASSETS_DIR, { dev: isDev })

// Serve all static files in the ASSETS_DIR folder
app.use(assets)

app.get("/earth", (_, res) => {
  console.log("> > request for /earth")
  try {
    const activePoints = Object.values(landscapeCache)
    res.send(activePoints)
  } catch (err) {
    // There should be better error handling obvs
    console.error(err)
    res.sendStatus(500)
  }
})

app.use("/earth", json())
app.post("/earth", async (req, res) => {
  console.log("> > new points for /earth")
  try {
    if (req.body && Array.isArray(req.body)) {
      req.body.every((point) => {
        if (!isLandscapePoint(point)) {
          throw new Error("data is not landscape point")
        }
  
        const key = hash(point)
        if (landscapeCache[key]) {
          throw new Error(`point already exists at position (${point.position.startX}, ${point.position.startY})`)
        }
      })

      req.body.forEach((point) => {
        const key = hash(point)
        landscapeCache[key] = point
        // Record the timestamp of each update,
        // so async save file task can compare against
        lastCacheUpdate = Date.now()
      })

      res.sendStatus(200)
    } else {
      throw new Error("unexpected body data")
    }
  } catch (err) {
    // There should be better error handling obvs
    console.error(err)
    res.sendStatus(500)
  }
})

// TODO!!!
// app.delete("/earth", (req, res) => {})

// Validating the request

// Add liminal rate limiting

// ...hot reloading for static files in dev mode or I could just set up two servers

// And fallback to...? 404?

// And database backups?

app.listen(PORT, () => console.log(`* ~ * ~ * server listening on port ${PORT} * ~ * ~ *`));

(function readLandscapeDataOnStartup (){
  console.log("~ * ~ * ~ pre-loading landscape ~ * ~ * ~")
  // TODO: Because this may take a while, I should add some
  // logic to make sure there haven't been incoming requests
  // to save data AND that the data on disk isn't all overwritten
  // if the original fetch has failed
  const dataPath = resolve(DATA_DIR, DATA_FILE)
  readFileData(dataPath, isActiveLandscape).then((data) => {
    Object.entries(data).forEach(([k, v]) => {
      landscapeCache[k] = v
    })
    lastFileWrite = Date.now()
    lastCacheUpdate = Date.now()
    // console.log("* * * CACHE POPULATED WITH:", landscapeCache)
  }).catch(err => {
    console.error("reading landscape data on startup", err)
  })

  const archivedDataPath = resolve(DATA_DIR, DATA_REMOVED_FILE)
  readFileData(archivedDataPath, isArchivedLandscape).then((data) => {
    Object.entries(data).forEach(([k, v]) => {
      removedLandscapeCache[k] = v
    })
    lastRemovedFileWrite = Date.now()
    lastRemovedCacheUpdate = Date.now()
    // console.log("* * * REMOVED CACHE POPULATED WITH:", removedLandscapeCache)
  }).catch(err => {
    console.error("reading landscape data on startup", err)
  })
})()

cron.schedule("1 * * * * *", () => {
  console.log("> > running update check")
  if (lastFileWrite < lastCacheUpdate) {
    console.log("> > . saving landscape data")
    const dataPath = resolve(DATA_DIR, DATA_FILE)
    writeLandscapeData(landscapeCache, dataPath)
      .then(() => lastFileWrite = Date.now())
    // TODO: Add some kind of mitigation when saving data fails
  }
  
  if (lastRemovedFileWrite < lastRemovedCacheUpdate) {
    console.log("> > . saving archived landscape data")
    const dataPath = resolve(DATA_DIR, DATA_REMOVED_FILE)
    writeLandscapeData(landscapeCache, dataPath)
      .then(() => lastRemovedFileWrite = Date.now())
    // TODO: Add some kind of mitigation when saving data fails
  }
}, {
  scheduled: true,
})
