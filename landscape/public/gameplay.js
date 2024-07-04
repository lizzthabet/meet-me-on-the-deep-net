const GRID_SIZE_PX = 50
const UP = 'up'
const DOWN = 'down'
const LEFT = 'left'
const RIGHT = 'right'
const WINDOW_VIEW_GRID_BUFFER = 5;
const EVENT_MOVE_UP = 'move-up'
const EVENT_MOVE_DOWN = 'move-down'
const EVENT_MOVE_LEFT = 'move-left'
const EVENT_MOVE_RIGHT = 'move-right'

// Note: this code is pretty tightly coupled with the CSS
// and document structure of the game pages that import it.
// Eek! But it simplifies the gameplay code into a central place.
// It should be imported in the document head with `defer`.

function toggleGrid() {
  const html = document.documentElement
  if (html && html.classList.contains("grid")) {
    html.classList.remove("grid")
  } else if (html) {
    html.classList.add("grid")
  }
}

function toggleHiddenClass(element, visible = true) {
  if (element && visible) {
    if (element.classList.contains("fade")) {
      element.classList.remove("hidden-with-fade")
    } else {
      element.classList.remove("hidden")
    }
  } else if (element && !visible) {
    if (element.classList.contains("fade")) {
      element.classList.add("hidden-with-fade")
    } else {
      element.classList.add("hidden")
    }
  }
}

function showOrHideSelector(selector, visible = true) {
  const element = document.querySelector(selector)
  toggleHiddenClass(element, visible)
}

function showOrHideSelectorList(selector, visible = true) {
  const elements = document.querySelectorAll(selector)
  elements.forEach(e => toggleHiddenClass(e, visible))
}

// Display the #next node and add an active area to game state
function displayNextNode(coords, href) {
  const next = document.getElementById("next")
  if (next) {
    next.classList.remove("hidden")
    // Update the URL
    next.setAttribute("href", href)
    // Add the active area attached to this item,
    // so link can be triggered by proximity
    const area = createActiveArea(coords, () => window.location.assign(href))
    state.activeAreas.push(area)
  }
}

function stringList(string) {
  if (!string) {
    return []
  }

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

// Returns {startX, startY, endX?, endY?} in grid coordinates for
// an element to be used in calculations, like obstacle definition
function getPositionOnGrid(element) {
  const { scrollX, scrollY } = window
  const { top, left, width, height } = element.getBoundingClientRect()
  const position = {
    startX: pixelsToGrid(scrollX + left),
    startY: pixelsToGrid(scrollY + top)
  }
  if (width > GRID_SIZE_PX) {
    const widthExceedingCell = width - GRID_SIZE_PX
    position.endX = pixelsToGrid(scrollX + left + widthExceedingCell)
  }

  if (height > GRID_SIZE_PX) {
    const heightExceedingCell = height - GRID_SIZE_PX
    position.endY = pixelsToGrid(scrollY + top + heightExceedingCell)
  }

  return position
}

function getPositionOnGridBySelector(selector) {
  const element = document.querySelector(selector)
  if (element) {
    return getPositionOnGrid(element)
  }
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
  if (!point || !activeFunc) {
    console.warn("Cannot create active area with missing information")
  }
  
  if (typeof point.x !== "number" || typeof point.y !== "number") {
    console.warn("Cannot create active area with invalid coordinates")
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
  const minXGridInView= pixelsToGrid(scrollX)
  const minYGridInView= pixelsToGrid(scrollY)
  const maxXGridInView= pixelsToGrid(innerWidth + scrollX)
  const maxYGridInView= pixelsToGrid(innerHeight + scrollY)

  // If element is out of view entirely, just scroll it into view,
  // and don't scroll incrementally
  if (
    x < minXGridInView ||
    x > maxXGridInView ||
    y < minYGridInView ||
    y > maxYGridInView
  ) {
    // console.log(`(${x}, ${y}) x: ${minXGridInView}-${maxXGridInView}, y: ${minYGridInView}-${maxYGridInView}`)
    element.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
    return
  }

  // Otherwise, check if element is in the buffer where scrolling
  // should be incremented slightly to keep the element in view
  const minXGridBuffer = minXGridInView + WINDOW_VIEW_GRID_BUFFER
  const minYGridBuffer = minYGridInView + WINDOW_VIEW_GRID_BUFFER
  const maxXGridBuffer = maxXGridInView - WINDOW_VIEW_GRID_BUFFER
  const maxYGridBuffer = maxYGridInView - WINDOW_VIEW_GRID_BUFFER

  let scroll = false
  const scrollOptions = { behavior: "instant", block: "nearest" }
  if (x <= minXGridBuffer || x >= maxXGridBuffer) {
    scroll = true
    scrollOptions.left = x <= minXGridBuffer ? -GRID_SIZE_PX : GRID_SIZE_PX
  }
  if (y <= minYGridBuffer || y >= maxYGridBuffer) {
    scroll = true
    scrollOptions.top = y <= minYGridBuffer ? -GRID_SIZE_PX : GRID_SIZE_PX
  }
  if (scroll) {
    // console.log(`(${x}, ${y}) x: ${minXGridBuffer}-${maxXGridBuffer}, y: ${minYGridBuffer}-${maxYGridBuffer}`)
    // console.log("scroll options:", scrollOptions)
    window.scrollBy(scrollOptions)
  }
}

function moveInvisibleElement(avatarX, avatarY) {
  const element = document.getElementById("for-invisible-scroll")
  if (element) {
    const x = pixelsToGrid(window.innerWidth || 1200) + avatarX
    const y = pixelsToGrid(window.innerHeight || 1200) + avatarY
    // console.log(`avatar at ${avatarX}, ${avatarY}, moving invisie to ${x}, ${y}`)
    positionOnGrid(element, x, y)
  }
}

function positionAvatarOnGrid(element, x, y) {
  const canMove = canMoveTo(x, y)
  if (canMove) {
    positionOnGrid(element, x, y)
    activateAreaIfOverlap(x, y)
    scrollIntoView(element, x, y)
    // Hack! :)
    // Position an invisible element away off the
    // screen, so that when the avatar is moving
    // into areas where there aren't DOM elements
    // the scroll buffer will work
    moveInvisibleElement(x, y)
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

  // Here's a very specific override to make sure that
  // typing in input text elements works when they're selected
  const activeElement = document.activeElement
  const isInput = activeElement.tagName.toLowerCase() === "input"
  if (isInput && activeElement.type === "text") {
    return
  }

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

