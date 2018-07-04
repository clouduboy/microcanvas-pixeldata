const globalState = document.body.dataset;


let spritename = ''

let painttool = 'flip'

let painting = false
let paintmode = 1

let paintcolor = 'white'

let zoom
const ZOOM_LEVELS = [2, 8, 16, 32]

const PAL_PICO8 = `black,#20337b,#7e2553,#008331,#ab5236,#454545,#c2c3c7,#fff1e8,#ff004d,#ffa300,#ffe727,#00e232,#29adff,#83769c,#ff77a8,#ffccaa`.split(',')


const canvas = document.querySelector('.artboard canvas')
canvas.width = 8
canvas.height = 8

const ctx = canvas.getContext('2d')
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
setPaintTool({target: document.querySelector('[data-set-tool="flip"]')})

// paint color setting
Array.from(document.querySelectorAll('[data-set-color]')).forEach(btn => btn.addEventListener('click', setPaintColor))

// drawing tools/modes
Array.from(document.querySelectorAll('[data-resize]')).forEach(btn => btn.addEventListener('click', resizeCanvas))
Array.from(document.querySelectorAll('[data-scroll]')).forEach(btn => btn.addEventListener('click', scrollCanvas))

// editor actions
Array.from(document.querySelectorAll('[data-action]')).forEach(btn => btn.addEventListener('click', exec))

// Zoom tracking
canvas.addEventListener('wheel', trackWheel)



// Onload
setTimeout(_ => {
  // set default palette
  setPalette(PAL_PICO8)
  paintcolor = '#fff1e8'

  // load sprite passed in via url
  inUrl = window.location.search.match(/pif=([^\?&]+)/)
  if (inUrl) {
    let pif = decodeURIComponent(inUrl[1]).replace(/\|/g,'\n')
    let pd = new PixelData(pif)
    console.log('url pd:', pif, pd)
    putSprite(pd)

  // load last saved sprite
  } else {
    loadSprite()
  }

  // scroll Mobile Chrome to hide address bar
  window.scrollTo(0,1);

  // set zoom
  changeZoom(autoZoom())
  toggleGrid(1)
  toggleCheckerboard(1)

  window.addEventListener('resize', () => changeZoom(autoZoom()))
}, 1)




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
  if (isNaN(coords.x) || isNaN(coords.y)) return

  const px = ctx.getImageData(coords.x,coords.y,1,1).data
  painting = true;

  if (painttool === 'flip') {
    paintmode = (px[3] === 0)
  }

  ctx.fillStyle = paintcolor

  paint(e)
}
function paintend() { painting = false; }
function paint(e) {
  if (painting) {
    const coords = canvasCoords(e)
    if (isNaN(coords.x) || isNaN(coords.y)) return

    if (paintmode) {
      ctx.fillRect(coords.x, coords.y, 1,1)
    } else {
      ctx.clearRect(coords.x, coords.y, 1,1)
    }

    spriteChanged()
  }
}

function touch(e) {
  console.log(e)
}

function trackWheel(e) {
  trackZoom(e.deltaY / 5)
}

zoomScaling = 0
function trackZoom(delta) {
  zoomScaling += delta

  if (zoomScaling > 1) {
    --zoomScaling
    fineZoom(+1)
  }

  if (zoomScaling < -1) {
    ++zoomScaling
    fineZoom(-1)
  }
}

function canvasCoords(e) {
  let xOrigin = e.clientX - e.target.clientLeft,
      yOrigin = e.clientY - e.target.clientTop,
      xRatio = e.target.clientWidth / canvas.width,
      yRatio = e.target.clientHeight / canvas.height

  if (zoom) {
    xOrigin -= (e.target.clientWidth - canvas.width*zoom) / 2
    yOrigin -= (e.target.clientHeight - canvas.height*zoom) / 2
    xRatio = yRatio = zoom
  }

  const coords = {
    x: Math.floor(xOrigin / xRatio),
    y: Math.floor(yOrigin / yRatio)
  }

  if (coords.x < 0 || coords.x >= canvas.width) coords.x = NaN
  if (coords.y < 0 || coords.y >= canvas.height) coords.y = NaN

  return coords
}

function setPaintTool(e) {
  painttool = (e.target.dataset.setTool || 'flip')
  if (painttool === 'erase') paintmode = false;
  if (painttool === 'paint') paintmode = true;

  let current = document.querySelector('.tool-palette button.current')
  if (current) current.classList.remove('current')
  e.target.classList.add('current')
}

function setPaintColor(e) {
  paintcolor = (e.target.dataset.setColor || 'white')
}
//TODO:palettes
//gamebuino palette: https://gamebuino.com/creations/color-palettes
//pico8 palette: https://ztiromoritz.github.io/pico-8-spick/palette_numbers.png
//dawnbringer (cats&coins) palette: http://pixeljoint.com/forum/forum_posts.asp?TID=12795

function resizeCanvas(e) {
  let cd = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height)

  let axis, dir

  if (e && e.target && e.target.dataset.resize) {
    axis = e.target.dataset.resize[0]
    dir =  e.target.dataset.resize[1] === '-' ? -1 : 1
  } else if (e && e.axis) {
    ({ axis, dir } = e)
  }

  if (axis) {
    switch(axis) {
      case 'w':
        ctx.canvas.width += dir
        break

      case 'h':
        ctx.canvas.height += dir
        break
    }

    ctx.putImageData(cd, 0,0)
  }

  globalState.cw = canvas.width
  globalState.ch = canvas.height
  updateCanvasStyle()

  popup(`${ctx.canvas.width}x${ctx.canvas.height}`, 900)
  spriteChanged()
}

function updateCanvasStyle() {
  let s = `--cw: ${globalState.cw}; --ch: ${globalState.ch};`
  if (globalState.zoom) s += ` --zoom: ${globalState.zoom};`

  document.body.style = s;
}


function scrollCanvas(e) {
  let cd = ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height)

  const axis = e.target.dataset.scroll[0]
  const dir = e.target.dataset.scroll[1] === '-' ? -1 : 1

  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)

  ctx.putImageData(cd, axis === 'x' ? dir : 0, axis === 'y' ? dir: 0)
  ctx.putImageData(cd, axis === 'x' ? dir-dir*ctx.canvas.width : 0, axis === 'y' ? dir-dir*ctx.canvas.height: 0)

  spriteChanged()
}

function popup(text, delay) {
  let POP = document.createElement('div')
  POP.className = 'pop'
  POP.textContent = text
  POP.classList.add('show')
  POP.classList.remove('fade')
  document.querySelector('.info-overlay').appendChild(POP)

  setTimeout(() => {
    POP.classList.add('fade')
  }, delay)

  setTimeout(() => {
    //POP.classList.remove('fade')
    //POP.classList.remove('show')
    POP.remove()
  }, 1000+100*text.length)
}

// TODO: stitch sprites together?
function imageData() {
  const imagedata = ctx.getImageData(0,0,canvas.width,canvas.height),
        pif = new PixelData(imagedata)

  return { imagedata, pif }
}
function exportpif() {
  let sprite = imageData().pif
  spritename = prompt('Sprite name?', spritename)||'sprite'
  sprite.id = spritename
  return sprite.pif
}

function exec(e) {
  switch(e.target.dataset.action) {
    case 'resize':
      globalState.currently = globalState.currently ? '' : 'sizing'
      break

    case 'export':
      let sprite = exportpif()
      tx = document.createElement('textarea')
      tx.className = 'dialog'
      document.body.appendChild(tx)
      tx.value = sprite
      console.log(sprite)
      tx.focus()
      tx.select()
      document.execCommand('copy')
      popup('copied!',1000)
      tx.addEventListener('keydown', (e) => { if (e.key === 'Escape') tx.remove() })
      break

    case 'import':
      tx = document.createElement('textarea')
      tx.className = 'dialog'
      document.body.appendChild(tx)
      tx.focus()
      tx.addEventListener('keydown', (e) => { if (e.key === 'Escape') tx.remove() })
      tx.addEventListener('paste', () => {
        console.log('pasted!!')
        setTimeout(_ => {
          let sprite = new PixelData(tx.value)
          if (sprite) {
            putSprite(sprite)
            changeZoom(autoZoom())
            tx.remove()
          } else {
            console.log('Invalid PixelData!')
          }
        }, 1)
      })
      break

    case 'zoom':
      changeZoom()
      break
  }
}

function autoZoom() {
  const artb = document.querySelector('.artboard')
  const az = Math.min(
    Math.floor(artb.clientWidth / canvas.width * .8),
    Math.floor(artb.clientHeight / canvas.height * .8)
  )
  console.log(`AutoZoom: ${az}`)
  return az
}

function fineZoom(zoomInOut) {
  changeZoom(zoom + zoomInOut)
}

function changeZoom(z) {
  if (z) {
    zoom = z
  } else {
    let nextZoomLevel = ZOOM_LEVELS.filter(l => l > zoom).shift()

    if (!nextZoomLevel) {
      zoom = zoom < autoZoom() ? autoZoom() : ZOOM_LEVELS[0]
    } else {
      zoom = nextZoomLevel
    }
  }

  if (zoom<2) zoom = 2

  globalState.zoom = zoom

  //if (!z) popup(`${zoom}x`)
  updateCanvasStyle()
}

function setPalette(pal) {
  const toolbar = document.querySelector('.color-palette')
  toolbar.innerHTML = ''

  pal.forEach(c => {
    let b = document.createElement('button')
    b.dataset.setColor=c
    b.style.backgroundColor=c
    b.addEventListener('click', setPaintColor)
    toolbar.appendChild(b)
  })
}

function spriteChanged() {
  const id = imageData()
  const serialized = JSON.stringify({
    width: id.imagedata.width,
    height: id.imagedata.height,
    data: Array.from(id.imagedata.data),
    pif: id.pif.pif
  })

  localStorage.setItem('last', serialized)
  // save also separately
  if (spritename) localStorage.setItem('saved-'+spritename, serialized)
}
function loadSprite(name) {
  const storage = localStorage.getItem(name ? 'saved-'+spritename : 'last')
  if (!storage) return

  const id = JSON.parse(storage)
  putSprite(id, spritename)
}

function putSprite(sprite, id) {
  canvas.width = sprite.width || sprite.w
  canvas.height = sprite.height || sprite.h
  spritename = id || sprite.id || spritename

  ctx.putImageData(new ImageData(new Uint8ClampedArray(sprite.data || sprite.rgba), canvas.width,canvas.height), 0,0)
  resizeCanvas()
}

function toggleCheckerboard(newState = !globalState.checkerboard) {
  //document.querySelector('.artboard canvas').classList.toggle('checkerboard')

  if (newState) return globalState.checkerboard=1
  delete globalState.checkerboard
}
function toggleGrid(newState = !globalState.grid) {
  //document.querySelector('.artboard canvas').classList.toggle('grid')

  if (newState) return globalState.grid=1
  delete globalState.grid
}


function toggleFramestrip() {
  document.body.dataset.framestrip = "on"
}
