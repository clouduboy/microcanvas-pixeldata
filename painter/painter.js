const canvas = document.querySelector('.artboard canvas')
canvas.width = 8
canvas.height = 8

const ctx = canvas.getContext('2d')
ctx.fillStyle = "white"
console.log(ctx)

//canvas.addEventListener('click', plot)

//canvas.addEventListener('mousedown', paintstart)
//canvas.addEventListener('mouseup', paintend)
//  canvas.addEventListener('mousemove', paint)

canvas.addEventListener('pointerdown', paintstart)
canvas.addEventListener('pointerup', paintend)
  canvas.addEventListener('pointermove', paint)


// paint tool setting
Array.from(document.querySelectorAll('[data-set-tool]')).forEach(btn => btn.addEventListener('click', setPaintTool))



let painttool = 'flip'

let painting = false;
let paintmode = 1;




function plot(e) {
  const coords = canvasCoords(e)

  paintstart(e)
  if (paintmode) {
    ctx.fillRect(coords.x, coords.y, 1,1)
  } else {
    ctx.clearRect(coords.x, coords.y, 1,1)
  }
  paintend()
}

function paintstart(e) {
  const coords = canvasCoords(e)
  const px = ctx.getImageData(coords.x,coords.y,1,1).data
  painting = true;

  if (painttool === 'flip') {
    paintmode = (px[0] === 0)
  }
  paint(e)
}
function paintend() { painting = false; }
function paint(e) {
  if (painting) {
    const coords = canvasCoords(e)
    if (paintmode) {
      ctx.fillRect(coords.x, coords.y, 1,1)
    } else {
      ctx.clearRect(coords.x, coords.y, 1,1)
    }
  }
}

function touch(e) {
  console.log(e)
}

function canvasCoords(e) {
  return {
    x: Math.floor((e.clientX - e.target.offsetLeft) / e.target.offsetWidth * canvas.width),
    y: Math.floor((e.clientY - e.target.offsetTop) / e.target.offsetHeight * canvas.height)
  }
}

function setPaintTool(e) {
  painttool = (e.target.dataset.setTool || 'flip')
  if (painttool === 'erase') paintmode = false;
  if (painttool === 'paint') paintmode = true;
  console.log(e.target.dataset,painttool, paintmode)
}
