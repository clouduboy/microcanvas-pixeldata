const globalState = document.body.dataset;


let spritename = ''

let painttool = 'flip'

let painting = false
let paintmode = 1

let paintcolor = 'white'

let zoom
const ZOOM_LEVELS = [2, 8, 16, 32]

const PAL_PICO8 = `#000000,#20337b,#7e2553,#008331,#ab5236,#454545,#c2c3c7,#ffffff,#ff004d,#ffa300,#ffe727,#00e232,#29adff,#83769c,#ff77a8,#ffccaa`.split(',')


const canvas = document.querySelector('.artboard canvas')
canvas.width = 8
canvas.height = 8

const ctx = canvas.getContext('2d')
console.log(ctx)

//canvas.addEventListener('click', plot)

if ('PointerEvent' in window) {
  canvas.addEventListener('pointerdown', paintstart)
  canvas.addEventListener('pointerup', paintend)
  canvas.addEventListener('pointermove', paint)
} else {
  canvas.addEventListener('mousedown', paintstart)
  canvas.addEventListener('mouseup', paintend)
  canvas.addEventListener('mousemove', paint)
}


// paint tool setting
Array.from(document.querySelectorAll('[data-set-tool]')).forEach(btn => btn.addEventListener('click', setPaintTool))
setPaintTool({target: document.querySelector('[data-set-tool="flip"]')})

// paint color setting
Array.from(document.querySelectorAll('[data-set-color]')).forEach(btn => btn.addEventListener('click', setPaintColor))

// drawing tools/modes
Array.from(document.querySelectorAll('[data-resize]')).forEach(btn => btn.addEventListener('click', resizeCanvas))
Array.from(document.querySelectorAll('[data-scroll]')).forEach(btn => btn.addEventListener('click', scrollCanvas))

// editor actions
Array.from(document.querySelectorAll('[data-action]')).forEach(btn => tap(btn, exec))

// Zoom tracking
canvas.addEventListener('wheel', trackWheel)



// Onload
setTimeout(_ => {
  // set default palette
  setPalette(PAL_PICO8)
  paintcolor = PAL_PICO8[7]

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


// close toolbars
// TODO: use main group button for switching visibility
document.body.addEventListener('click', e => {
  Array.from(document.querySelectorAll('.tool-palette button.open')).forEach(btn => {
    if (btn !== e.target) btn.classList.remove('open')
  })
}, true)




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
  if (!e || !e.target) return
  painttool = (e.target.dataset.setTool || 'flip')
  if (painttool === 'erase') paintmode = false
  if (painttool === 'paint') paintmode = true

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

// TODO: this currently fails for multi-frame sprites
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

  updateCanvasStyle()

  popup(`${ctx.canvas.width}x${ctx.canvas.height}`, 900)
  spriteChanged(cd)
}

function updateCanvasStyle() {
  globalState.cw = canvas.width
  globalState.ch = canvas.height

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


function exportpif() {
  let sprite = fullSprite || canvasSprite()
  spritename = prompt('Sprite name?', spritename)||'sprite'
  sprite.id = spritename
  return sprite.pif
}
function serializeImageData(img) {
  const imagedata = ctx.getImageData(0,0,canvas.width,canvas.height)

  return JSON.stringify({
    width: imagedata.width,
    height: imagedata.height,
    data: Array.from(imagedata.data)
  })
}
function deserializeImageData(src) {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height)
}

function exec(e) {
  // Expand toolbars
  if ([
    'file/', 'view/', 'transform/', 'edit/', 'tool/'
  ].includes(e.target.dataset.action)) {
    console.log(e.action, e.target.dataset.action)

    // close all other toolbars
    Array.from(e.target.parentNode.querySelectorAll('button.open')).forEach(btn => {
      if (btn !== e.target) {
        btn.classList.remove('open')
      }
    })

    // toggle current
    if (e.action === 'tap') {
      e.target.classList.toggle('open')
    }
  }

  switch(e.target.dataset.action) {
    case 'resize': // TODO: deprecated
    case 'edit/canvas size':
      globalState.currently = globalState.currently ? '' : 'sizing'
      break

    case 'export': // TODO: deprecated
    case 'file/save':
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

    case 'file/share':
      const sharesprite = fullSprite || canvasSprite()
      const pifurl = PixelData.pifInUrl(sharesprite)
      const url = `//create.clouduboy.org/painter/?pif=${pifurl}`
      window.open(url)
      break

    case 'import': // TODO: deprecated
    case 'file/load':
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
            spriteChanged()
            changeZoom(autoZoom())
            tx.remove()
          } else {
            console.log('Invalid PixelData!')
          }
        }, 1)
      })
      break

    // toplevel view button
    case 'view/':
      console.log('view button exec`d', e.action)

      if (e.action == 'tap-hold') {
        let z = globalState
        changeZoom(2)
      } else if (e.action == 'tap-release') {
        changeZoom(autoZoom())
      }
      break

    case 'zoom': // TODO: deprecated
    case 'view/zoom':
      changeZoom()
      break

    case 'frame/prev':
    case 'frame/next':
      let dir = e.target.dataset.action==='frame/prev' ? -1 : +1
      let frame = parseInt(document.body.dataset.frame,10) + dir
      if (frame < 0) frame = fullSprite.frames-1
      if (frame >= fullSprite.frames) frame = 0

      putSprite(fullSprite, undefined, frame)
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

function canvasSprite() {
  const canvascontents = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const canvassprite = new PixelData(canvascontents)
  return canvassprite
}
function spriteChanged(data) {
  const canvascontents = data || ctx.getImageData(0, 0, canvas.width, canvas.height)
  const newsprite = new PixelData(canvascontents)

  // Update fullSprite framedata
  // Because frame content is a slice (view) into the fullSprite
  // we need to update (mutate) the bitmap contents in-place
  if (fullSprite) {
    let cs = newsprite.bitmap
    let fs = (fullSprite.frames ? fullSprite.frame(document.body.dataset.frame) : fullSprite).bitmap

    for (let y = 0; y<fs.length; ++y) {
      for (let x = 0; x<fs[y].length; ++x) {
        fs[y][x] = cs[y][x]
      }
    }

    // update fullSprite palette
    // TODO: proper full palette handling
    fullSprite.palette = newsprite.palette

  } else {
    fullSprite = newsprite
  }

  const serialized = JSON.stringify({
    width: canvascontents.width,
    height: canvascontents.height,
    data: Array.from(canvascontents.data),
    pif: (fullSprite ? fullSprite : newsprite).pif
  })

  localStorage.setItem('last', serialized)
  // save also separately
  if (spritename) localStorage.setItem('saved-'+spritename, serialized)
}
function loadSprite(name) {
  const storage = localStorage.getItem(name ? 'saved-'+spritename : 'last')
  if (!storage) return

  const imagedata = JSON.parse(storage)
  const sprite = imagedata.pif ? new PixelData(imagedata.pif) : imagedata

  putSprite(sprite, spritename)
}

var fullSprite
function putSprite(sprite, id, frame = 0) {
  console.log(sprite)
  canvas.width = sprite.width || sprite.w
  canvas.height = sprite.height || sprite.h
  spritename = id || sprite.id || spritename

  // Multiframe sprite
  if (sprite.frames) {
    document.body.dataset.frame = frame
    fullSprite = sprite
    sprite = fullSprite.frame(frame)
  } else {
    delete document.body.dataset.frame
    fullSprite = sprite
  }

  // Put the selected image data/frame onto the canvas
  const canvasdata = new ImageData(
    sprite.rgba || Uint8ClampedArray.from(sprite.data),
    sprite.w || canvas.width
  )

  ctx.putImageData(canvasdata, 0,0)

  // Fix canvas sizing
  updateCanvasStyle()
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


function tap(element, handler) {
  let context = {}

  const tapStart = (e) => {
    console.log(e.type)
    context.event = { target: e.target }
    context.start = Date.now()
    context.startPos = [
      (e.clientX - e.target.clientLeft) / e.target.clientWidth,
      (e.clientY - e.target.clientTop) / e.target.clientHeight
    ]

    e.preventDefault()

    context.longtap = setTimeout(_ => tapEnd({ type: 'longtap-timeout' }), 400)
  }

  const tapEnd = (e) => {
    console.log(e.type)

    // cancel - tap wasn't started on this element
    if (!context.start) {
      console.log('cancelled tap')
      context = {}
      return
    }

    context.event.action = context.state === 'hold' ? 'tap-release' : 'tap'


    context.end = Date.now()

    if (!context.endPos) {
      context.endPos = context.startPos
    }

    context.time = context.end-context.start
    context.dist = Math.sqrt(
      Math.pow(context.endPos[0]-context.startPos[0], 2) +
      Math.pow(context.endPos[1]-context.startPos[1], 2)
    )

    // Was this a longtap?
    if (e.type === 'longtap-timeout') {
      if (context.dist < 5) {
        context.event.action = 'tap-hold'
        handler.call(element, context.event)
        context.state = 'hold'
        return
      } else {
        console.log('cancelled long tap')
        context = {}
        return
      }

    // No longtap occured, clear the longtap timer
    } else {
      if (context.longtap) {
        clearTimeout(context.longtap)
      }
    }

    e.preventDefault && e.preventDefault()
    handler.call(element, context.event)

    console.log(context)
    context = {}
  }

  const tapMove = (e) => {
    context.endPos = [
      (e.clientX - e.target.clientLeft) / e.target.clientWidth,
      (e.clientY - e.target.clientTop) / e.target.clientHeight
    ]
  }

  // tap, longtap, swipe, drag
  if ('PointerEvent' in window) {
    // todo: add to an overlay element to track swipes outside of element bounds
    element.addEventListener('pointerdown', tapStart)
    element.addEventListener('pointerup',   tapEnd)
    element.addEventListener('pointermove', tapMove)
  } else {
    element.addEventListener('mousedown', tapStart)
    element.addEventListener('mouseup',   tapEnd)
    element.addEventListener('mousemove', tapMove)
  }
}
