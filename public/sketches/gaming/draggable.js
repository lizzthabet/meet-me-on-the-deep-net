// CSS to add if you'd like a visual indicator
// [data-draggable]:hover {
//   cursor: move;
// }

function moveOnMouseDown(event) {
  // Use the currentTarget for calculating position, because it's the
  // element that has the "data-draggable" property on it. The target
  // may be another element inside of it.
  const { currentTarget, pageX, pageY, clientX, clientY } = event
  const { left, top } = currentTarget.getBoundingClientRect()
  const shiftX = clientX - left
  const shiftY = clientY - top

  function moveTo(pageX, pageY) {
    const newLeft = pageX - shiftX + "px"
    const newTop = pageY - shiftY + "px"
    currentTarget.style.setProperty("left", newLeft)
    currentTarget.style.setProperty("top", newTop)
  }

  function onMouseMove(event) {
    moveTo(event.pageX, event.pageY)
  }

  function onMouseUp(event) {
    document.removeEventListener("mousemove", onMouseMove)
    document.removeEventListener("mouseup", onMouseUp)
  }

  document.addEventListener("mousemove", onMouseMove)
  document.addEventListener("mouseup", onMouseUp)
}

window.addEventListener("DOMContentLoaded", () => {
  const draggable = document.querySelectorAll("[data-draggable]")
  draggable.forEach((ele) => {
    ele.style.setProperty("position", "absolute")
    ele.style.setProperty("cursor", "move")
    ele.addEventListener("mousedown", moveOnMouseDown)
  })
})