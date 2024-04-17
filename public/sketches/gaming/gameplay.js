const GRID_SIZE_PX = 50
const UP = 'up'
const DOWN = 'down'
const LEFT = 'left'
const RIGHT = 'right'
const WINDOW_VIEW_GRID_BUFFER = 3;

// Note: this code is pretty tightly coupled with the CSS
// and document structure of the game pages that import it.
// Eek! But it simplifies the gameplay code into a central place.
// It should be imported in the document head with `defer`.

function updateDirection(html, { append } = { append: false }) {
  const direction = document.getElementById("direction")
  if (direction) {
    if (append) {
      direction.innerHTML = direction.innerHTML + " " + html
    } else {
      direction.innerHTML = html
    }
    direction.classList.remove("hidden")
  }
}

function resetDirection() {
  const direction = document.getElementById("direction")
  if (direction) {
    direction.classList.add("hidden")
    direction.innerHTML = ""
  }
}

function showOrHideSelector(selector, visibility = true) {
  const element = document.querySelector(selector)
  if (element && visibility) {
    element.classList.remove("hidden")
  } else if (element && !visibility) {
    element.classList.add("hidden")
  }
}

// TODO: I'm probably gonna need to refactor this to better
// handle how text from multiple nodes may be triggered at
// the same. It could move to a global direction queue, possibly?
// Maybe with a global state = "animatingTextInProgress"?
function displayOneByOne(htmlList, { append } = { append: false }) {
  if (!Array.isArray(htmlList)) {
    console.warn("Displaying elements one-by-one requires a list of elements")
    return
  }

  if (htmlList.length === 0) {
    return
  }

  // Treat the html string list like a queue that gets added
  // one-by-one to the direction
  const htmlString = htmlList.shift()
  updateDirection(htmlString, { append })
  setTimeout(() => displayOneByOne(htmlList, { append: true }), 250)
}

function stringList(string) {
  return string.split(" ")
}

function positionInPlace(element) {
  const { top, left } = element.getBoundingClientRect()
  const { scrollX, scrollY } = window
  setTopLeft(element, top + scrollY, left + scrollX)
}

function setPositionAbsolute(element) {
  element.style.setProperty("position", "absolute")
}

function setTopLeft(element, top, left) {
  element.style.setProperty("top", top + "px")
  element.style.setProperty("left", left + "px")
}

// Convert grid coordinates like (1, 2) to pixel values (50px, 100px)
function gridToPixels(n) {
  return n * GRID_SIZE_PX
}

// Convert pixels to nearest grid coordinates like (55px, 5px) to (1, 0)
function pixelsToGrid(n) {
  const nearestGridPixelValue = n - (n % GRID_SIZE_PX)
  return nearestGridPixelValue / GRID_SIZE_PX
}

function positionOnGrid(element, x, y, center = true) {
  // Scale the (x, y) of the grid to pixels on screen
  const xPixels = gridToPixels(x)
  const yPixels = gridToPixels(y)

  // Center the element in the grid cell
  let xOffset = 0
  let yOffset = 0
  if (center) {
    const { height, width } = element.getBoundingClientRect()
    if (height > 0 && width > 0) {
      xOffset = (GRID_SIZE_PX - width) / 2
      yOffset = (GRID_SIZE_PX - height) / 2
    }
  }

  // Position element precisely
  setTopLeft(element, yPixels + yOffset, xPixels + xOffset)
}

function positionOnGridBySelector(selector, positions) {
  const elements = document.querySelectorAll(selector)
  elements.forEach((e, i) => {
    const p = positions[i]
    if (!p) {
      console.warn(`no position specified for ${selector} #${i}`)
      return
    }

    positionOnGrid(e, p.x, p.y, p.center)
    setPositionAbsolute(e)
  })
}

// Helper for defining an active area; returns:
// {startX, startY, endX, endY, activation}.
// Note: this only handles centering a 1x1 grid cell
function createActiveArea(
  point, // {x, y}
  activeFunc, // Function to trigger on activation
  // Defaults for creating an area around one grid cell
  options = { height: 3, width: 3, center: true }
) {
  if (!point || ! activeFunc) {
    console.warn("Cannot create active area with missing information")
  }

  const area = {
    activation: activeFunc
  }

  if (options.center) {
    const areaX = (options.width - 1) / 2
    area.startX = point.x - areaX
    area.endX = point.x + areaX
    const areaY = (options.height - 1) / 2
    area.startY = point.y - areaY
    area.endY = point.y + areaY
  } else {
    area.startX = point.x
    area.endX = point.x + options.width - 1
    area.startY = point.y
    area.endY = point.y + options.height - 1
  }
  // take a point of x,y, func, and options (size: height, width, center)
  // it will calculate the 
  // returns { startX, startY, endX, endY, activation }
  return area
}

// Check if an (x, y) are within an area of {startX, startY, endX, endY} coordinates
function checkInsideCoords(x, y, coords) {
  const endX = coords.endX ?? coords.startX
  const endY = coords.endY ?? coords.startY
  if (x >= coords.startX && x <= endX && y >= coords.startY && y <= endY) {
    return true
  }
  return false
}

// Check if an (x, y) is beyond an area of {startX, startY, endX, endY} coordinates
function checkExceedCoords(x, y, coords) {
  const endX = coords.endX ?? Infinity
  const endY = coords.endY ?? Infinity
  if (x < coords.startX || x > endX || y < coords.startY || y > endY) {
    return true
  }
  return false
}

// Returns whether or not the coordinates overlap with an obstacle
// or a boundary
function canMoveTo(x, y) {
  // Check boundaries first
  for (let i = 0; i < state.boundaries.length; i++) {
    const exceeds = checkExceedCoords(x, y, state.boundaries[i])
    if (exceeds) {
      return false
    }
  }
  // Check obstacles next
  for (let i = 0; i < state.obstacles.length; i++) {
    const inside = checkInsideCoords(x, y, state.obstacles[i])
    if (inside) {
      return false
    }
  }
  return true
}

// Loop through the active areas (defined outside of this doc)
// and trigger any functions that overlap with coordinates
function activateAreaIfOverlap(x, y) {
  for (let i = 0; i < state.activeAreas.length; i++) {
    const area = state.activeAreas[i]
    const inside = checkInsideCoords(x, y, area)
    const alreadyActive = state.activeArea === area
    if (inside) {
      if (!alreadyActive) {
        state.activeArea = area
        area.activation()
      }
      // We don't need to check other active points
      // since there should only be one at once
      return
    }
  }

  // Since there aren't any active areas
  // reset this state
  state.activeArea = null
}

// Scroll the element into view if it's moved off the screen
function scrollIntoView(element, x, y) {
  const { scrollX, scrollY, innerHeight, innerWidth } = window
  const minXGridInView = pixelsToGrid(scrollX) + WINDOW_VIEW_GRID_BUFFER
  const minYGridInView = pixelsToGrid(scrollY) + WINDOW_VIEW_GRID_BUFFER
  const maxXGridInView = pixelsToGrid(innerWidth + scrollX) - WINDOW_VIEW_GRID_BUFFER
  const maxYGridInView = pixelsToGrid(innerHeight + scrollY) - WINDOW_VIEW_GRID_BUFFER
  let scroll = false
  const scrollOptions = { behavior: "instant", block: "nearest" }
  if (x <= minXGridInView || x >= maxXGridInView) {
    scroll = true
    scrollOptions.left = x <= minXGridInView ? -GRID_SIZE_PX : GRID_SIZE_PX
  }
  if ( y <= minYGridInView || y >= maxYGridInView) {
    scroll = true
    scrollOptions.top = y <= minXGridInView ? -GRID_SIZE_PX : GRID_SIZE_PX
  }
  if (scroll) {
    // console.log(`x: ${minXGridInView}-${maxXGridInView}, y: ${minYGridInView}-${maxYGridInView}`)
    // console.log("scroll options:", scrollOptions)
    // TODO: These calculations are a little buggy if the avatar is already in view OR if the avatar is completely out of view
    window.scrollBy(scrollOptions)
  }
}

function positionAvatarOnGrid(element, x, y) {
  const canMove = canMoveTo(x, y)
  if (canMove) {
    positionOnGrid(element, x, y)
    activateAreaIfOverlap(x, y)
    scrollIntoView(element, x, y)
    // TODO: potentially resize html to cover explored area
  }
}

function moveDirectionOnGrid(element, direction) {
  const { top, left } = element.getBoundingClientRect()
  const { scrollX, scrollY } = window
  // Convert element's position (with scroll) to grid coordinates
  const gridX = pixelsToGrid(left + scrollX)
  const gridY = pixelsToGrid(top + scrollY)
  // console.log(`Nearest grid for (${left}px, ${top}px) is (${gridX}, ${gridY})`)
  // Change grid coordinates based on direction
  let nextGridX = gridX
  let nextGridY = gridY
  switch(direction) {
    case UP:
      nextGridY--
      break
    case DOWN:
      nextGridY++
      break
    case LEFT:
      nextGridX--
      break
    case RIGHT:
      nextGridX++
      break
  }
  // Position element with grid cooridnates
  positionAvatarOnGrid(element, nextGridX, nextGridY)
}

function onArrowButtonClick(direction) {
  console.log("direction", direction)
  const you = document.getElementById("you")
  switch(direction) {
    case UP:
      moveDirectionOnGrid(you, UP)
      break
    case DOWN:
      moveDirectionOnGrid(you, DOWN)
      break
    case LEFT:
      moveDirectionOnGrid(you, LEFT)
      break
    case RIGHT:
      moveDirectionOnGrid(you, RIGHT)
      break
    default:
      return
  }
}

function onKeyDown(event) {
  // TODO: It may be helpful to check if any content that
  // has semantic control value is focused, instead of
  // completely stopping native arrow key behavior that's
  // very usefully for accessibility.
  switch(event.key) {
    case 'ArrowUp':
    case 'w':
      event.preventDefault()
      moveDirectionOnGrid(you, UP)
      break
    case 'ArrowDown':
    case 's':
      event.preventDefault()
      moveDirectionOnGrid(you, DOWN)
      break
    case 'ArrowLeft':
    case 'a':
      event.preventDefault()
      moveDirectionOnGrid(you, LEFT)
      break
    case 'ArrowRight':
    case 'd':
      event.preventDefault()
      moveDirectionOnGrid(you, RIGHT)
      break
    default:
      return
  }
}
