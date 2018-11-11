self.FloodFill = (function() {

return ({
  pifToSvg
})


function pifToSvg(pif, color) {
  let bitmap = normalize(new PixelData(pif).bitmap)

  selectpixels(bitmap, 'brown', { algo: flood_spread, continuous: false, shapes: true } )

  return svgdataurl(tosvg(bitmap, color, { method: bitmap2svg_edgetrace }))
}

function paint(bitmap, color='white') {
  let x=0, y=0

  bitmap = normalize(bitmap)

  canvas.height = bitmap.length
  canvas.width = bitmap[0].length
  ctx.fillStyle = 'white'

  bitmap.forEach(row => {
    row.forEach(pixel => {
      if (pixel) ctx.fillRect(x,y,1,1)
      ++x
    })
    ++y
    x=0
  })
}

function stringify(bitmap) {
  let ret

  bitmap = normalize(bitmap)

  ret = bitmap.map(
    row => row.map(
      pixel => pixel?'#':'.'
    ).join('')
  ).join('\n')

  return ret
}

function showsvg(bitmap, color, options) {
  const img = document.createElement('img')

  img.src = svgdataurl(tosvg(bitmap, color, options))
  document.body.appendChild(img)
}

function tosvg(bitmap, color='currentcolor', options = {}) {
  // TODO: automatic impl method selection:
  // Use best (e.g. edge trace) algo first, render resulting svg
  // to canvas and diff with naive impl, make sure it renders
  // correctly, otherwise fall back to naive output.
  const impl = options.method || bitmap2svg_naive
  const w = bitmap[0].length, h = bitmap.length

  const result = impl({ bitmap, color, w, h, origin: options.origin||[] })

  console.log('Using SVG tracer: ', impl.name||impl.toString(), ' - SVG path length: ', result.length, 'bytes')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${result}</svg>`
}

// Naive impl: each pixel is turned into an 1x1 px filled square
function bitmap2svg_naive(options) {
  const path = []
  let x = 0, y = 0

  options.bitmap.forEach(row => {
    row.forEach(pixel => {
      // TODO: color check
      if (pixel) path.push(`M${x} ${y}h1v1h-1z`)
      ++x
    })
    ++y
    x=0
  })

  // Just return the path segments (usually other impl-s use
  // this to embed rendering of various sub-paths)
  if (options.pathonly) {
    return path.join('')
  }

  return `<path fill="${options.color}" d="${path.join('')}"/>`
}

// Scanline: same as naiveconst sel = getselection\(bitmap, algoopts\), but horizontal pixel runs
// are collapsed into a single filled rectangle
function bitmap2svg_scanline(options) {
  const path = []
  let x = 0, y = 0

  options.bitmap.forEach(row => {
    let w = 0;

    row.forEach(pixel => {
      // TODO: color check
      if (pixel) {
        if (w == 0) path.push(`M${x} ${y}`)
        ++w
      } else {
        if (w > 0) path.push(`h${w}v1h${-w}z`)
        w = 0
      }

      ++x
    })

    if (w > 0) path.push(`h${w}v1h${-w}z`)

    ++y
    x = 0
  })

  // Just return the path segments (usually other impl-s use
  // this to embed rendering of various sub-paths)
  if (options.pathonly) {
    return path.join()
  }

  return `<path fill="${options.color}" d="${path.join('')}"/>`
}

// Edge Trace: tries to trace object edges
function bitmap2svg_edgetrace(options) {
  const b = options.bitmap
  const paths = []

  const pixel = (x,y) => {
    if (x < 0 || y < 0 || x >= options.w || y >= options.h) return undefined;
    return b[y][x]
  }

  const trace = (sx,sy) => {
    const path = []
    let x = sx, y = sy

    // initial direction could be any one of the four
    let d, initd
    if (!pixel(x-1,y)) {
      path.push(`M${x} ${y+1}v-1`)
      d = 'u'
    } else if (!pixel(x,y-1)) {
      path.push(`M${x} ${y}h1`)
      d = 'r'
    } else if (!pixel(x+1,y)) {
      path.push(`M${x+1} ${y}v1`)
      d = 'd'
    } else {
      path.push(`M${x+1} ${y+1}h-1`)
      d = 'l'
    }

    initd = d
    while (pixel(x,y)) {

      switch (d) {

      // →       → →      →↑#
      // x↓  or  x #  or  x #
      case 'r':
        if (!pixel(x+1,y)) {
          path.push(`v1`)
          d = 'd'
        } else if (pixel(x+1,y-1)) {
          x = x+1
          y = y-1
          path.push(`v-1`)
          d = 'u'
        } else {
          x = x+1
          path.push(`h1`)
        }

        break

      //  →      ↑#      # #
      // ↑x  or  ↑x  or  ←↑x
      case 'u':
        if (!pixel(x,y-1)) {
          path.push(`h1`)
          d = 'r'
        // } else if {
        } else if (pixel(x-1,y-1)) {
          x = x-1
          y = y-1
          path.push(`h-1`)
          d = 'l'
        } else {
          path.push(`v-1`)
          y = y-1
        }

        break

      //  x↓  or  x↓  or  x↓→
      //  ←       #↓      # #
      case 'd':
        if (!pixel(x,y+1)) {
          path.push(`h-1`)
          d = 'l'
        // } else if {
        } else if (pixel(x+1,y+1)) {
          x = x+1
          y = y+1
          path.push(`h1`)
          d = 'r'
        } else {
          path.push(`v1`)
          y = y+1
        }

        break

      // ↑x  or  # x  or  # x
      //  ←      ← ←      #↓←
      case 'l':
        if (!pixel(x-1,y)) {
          path.push(`v-1`)
          d = 'u'
        } else if (pixel(x-1,y+1)) {
          x = x-1
          y = y+1
          path.push(`v1`)
          d = 'd'
        } else {
          x = x-1
          path.push(`h-1`)
        }

        break

      default:
        // TODO: ?
        path.push(`L9 9z`)
        x = y = -1 // will break the loop
      }

      // did we come full circle?
      // (arrived back to the same pixel and with the initial direction)
      if (path.length>3 && x == sx && y == sy && d == initd) {
        path.pop() // pop last path => it's a duplicate of the first

        // Remove last move and replace with "z" (connect to start)
        path.pop()
        path.push('z')
        break
      }
    }

    return path
  }

  // Detect all subshapes
  const sel = getselection(b, { algo: flood_spread, continuous: false, shapes: true })

  const cutout = {
    pixels: new Map(),
    shapes: [],
    paths: []
  }
  sel.shapes.forEach(shape => {
    // shape.origin can be (and usually is) in the middle of the
    // shape - we need to choose a nice edge pixel
    let sx, sy, score = 0
    for (const [x,y] of shape.pixels.values()) {
      // Neighbouring pixels around, u/r/d/l
      const npx = [
        [x,y-1], [x+1,y], [x,y+1], [x-1,y]
      ]

      // Current pixel edge score
      // 0 => not edge at all,
      // 4 => full disconnected single pixel
      const pixelscore = npx.map(px => !pixel(px[0],px[1])|0).reduce((a,b) => a+b)

      // Keep track of pixel with the best score
      if (pixelscore>score) {
        score = pixelscore
        sx = x
        sy = y
      }

      // Use the neighbors of edge pixels to build a list of cutout shapes
      if (pixelscore > 0) {
        npx.filter(px => pixel(px[0],px[1]) === 0).forEach(([x,y]) => {
          // Find all possible cutout pixels
          if (!cutout.pixels.has(`${x},${y}`)) {
            cutout.pixels.set(`${x},${y}`, [x,y])

            // Find all transparent pixels connected to this edge pixel
            // to form the cutout shape
            let newcpx = getselection(b, { algo: flood_spread, color: 0, origin: [x,y] })

            // All newcpx pixels are stored
            cutout.pixels = new Map([...cutout.pixels, ...newcpx.pixels])

            // Can only be a cutout shape if has no edge pixels
            if (Array.from(newcpx.pixels.values()).filter(
              // Checks for pixels around the edge of the sprite
              ([x,y]) => x%(newcpx.w-1) === 0 || y%(newcpx.h-1) === 0
            ).length == 0) {
              cutout.shapes.push({
                origin: newcpx.origin,
                pixels: newcpx.pixels
              })

              let impl = bitmap2svg_edgetrace
              let cutpath = impl(Object.assign({}, {
                bitmap: pixels2bitmap(Object.assign({}, newcpx, { color: 1 })),
                w: newcpx.w,
                h: newcpx.h,
                // return only the path segments
                pathonly: true
              }))
              cutout.paths.push(cutpath)
              paths.push([cutpath])
            }
          }
        })

        // Snip out the cutout shapes :)
        //if ()
      }

    }
    paths.push(trace(sx,sy))
  })

  // Collapse/optimize away consecutive 1px moves in the
  // TODO: svgo-style optimize with absolute coords where it makes sense
  // (e.g. h-17 at (17,0) => H0)
  let opt = paths.map(segment => segment.join('')).join('').replace(
    // due to the nature of the algorithm h-1h1h-1 back'n'forth-s don't
    // naturally occur so we don't have to guard for them below
    /(h\-?1){2,}|(v\-?1){2,}/g,
    r => r[0] + (r[1]=='-' ? '-'+r.length/3 : r.length/2)
  )

  // TODO: Add negative (cutout) shapes
  // TODO: we don't need the fill-rule if we reverse path direction of
  // the cutout shapes:
  // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule#nonzero

  // Just return the path segments (usually other impl-s use
  // this to embed rendering of various sub-paths)
  if (options.pathonly) {
    return opt
  }

  console.log(
    'Total shapes: ', sel.shapes.length,
    '\nTotal paths: ', paths.length,
    '\n * of which Cutout paths: ', cutout.paths.length
  )

  return `<path fill="${options.color}" fill-rule="evenodd" d="${opt}"/>`
}

function svgdataurl(svg) {
  return `data:image/svg+xml,${svg.replace(/</g,'%3C').replace(/>/g,'%3E').replace(/"/g, '\'')}`
}

function normalize(bitmap) {
  const norm = []
  bitmap.forEach(row => norm.push(Array.from(row, i => i?i:0)))
  return norm
}

function pixels2bitmap(options) {
  const { w, h } = options
  const color = typeof options.color == 'number' ? options.color : 1

  let arr = (new Array(h).fill(null)).map(
    _ => new Array(w).fill(0)
  )

  // Fill new array with pixels of specified color
  // Supports an Array and Map of [x,y] pixel tuples
  let pixels = (options.pixels instanceof Map
    ? Array.from(options.pixels.values())
    : options.pixels
  )

  pixels.forEach(
    ([x,y]) => arr[y][x] = color
  )

  //console.log('All pixels (',pixels.length,'): ')
  //console.log(new PixelData(arr).pif)
  return arr
}

function selectpixels(bitmap, paintcolor='white', algoopts) {
  const sel = getselection(bitmap, algoopts)
  const pixels = Array.from(sel.pixels.values())

  const selc = document.createElement('canvas')
  const sc = selc.getContext('2d')

  selc.width = sel.w
  selc.height = sel.h

  sc.fillStyle = paintcolor

  let p = 0
  const phase = pixels.length
  const phasecallback = () => {
    p++
    if (p>=phase) {
      p= -30
    }

    if (p>=0) {
      sc.clearRect(0,0,sel.w,sel.h)
      for (let i = 0; i <= p; ++i) {
        sc.fillRect(pixels[i][0],pixels[i][1],1,1)
      }
    }
  }

  setInterval(phasecallback, 30)

  document.body.appendChild(selc)
}

function findpixels(bitmap, color) {
  // create a list of [x,y] pixel coordinates for "color"-colored pixels
  return bitmap.reduce(
    (p, row, y) => p.concat(
      // Note down coordinates of all valid colors
      row.map(
        (i, x) => i === color ? [x,y] : undefined
      // Throw away all other colors
      ).filter(i => !!i)
    ), [])
}

function getselection(source, options = {}) {
  const bitmap = JSON.parse(JSON.stringify(normalize(source)))
  let s = {
    // clone source, operate on a duplicate
    bitmap: bitmap,
    w: bitmap[0].length,
    h: bitmap.length,
    pixels: new Map(),
    algo: options.algo || flood_lrud,
    continuous: typeof options.continuous == 'undefined' ? true : !!options.continuous,
    color: typeof options.color == 'number' ? options.color : 1
  }

  // Run origin-finding algo
  const origin = options.origin || findpixels(bitmap, s.color)[0] || []

  s.origin = origin
  s.ox = origin[0]
  s.oy = origin[1]

  // Run shape-finding algo
  s.algo(s.ox,s.oy)

  if (!s.continuous) {
    const morepixels = findpixels(bitmap, s.color)

    // list all shapes separately?
    if (options.shapes) {
      s.shapes  = (s.shapes || []).concat([{
        origin: s.origin,
        pixels: s.pixels
      }])
    }

    // no more sub-shapes
    if (!morepixels.length) return s

    const nextpixel = morepixels[morepixels.length>>1]
    const subsel = getselection(bitmap, Object.assign({}, options, { origin: nextpixel }))

    s.pixels = new Map([...s.pixels, ...subsel.pixels])
    if (options.shapes) {
      s.shapes = s.shapes.concat(subsel.shapes)
    }

  }

  return s
}


function flood_lrud(x,y) {
  if (this.bitmap[y][x]) {

    this.pixels.set(`${x},${y}`, [x,y])

    this.bitmap[y][x] = 0

    if (x>0        && this.bitmap[y][x-1] === this.color) this.algo(x-1,y)
    if (x<this.w-1 && this.bitmap[y][x+1] === this.color) this.algo(x+1,y)
    if (y>0        && this.bitmap[y-1][x] === this.color) this.algo(x,y-1)
    if (y<this.h-1 && this.bitmap[y+1][x] === this.color) this.algo(x,y+1)
  }
}

function flood_rdlu(x,y) {
  if (this.bitmap[y][x]) {

    this.pixels.set(`${x},${y}`, [x,y])

    this.bitmap[y][x] = 0

    if (x<this.w-1 && this.bitmap[y][x+1] === this.color) this.algo(x+1,y)
    if (y<this.h-1 && this.bitmap[y+1][x] === this.color) this.algo(x,y+1)
    if (x>0        && this.bitmap[y][x-1] === this.color) this.algo(x-1,y)
    if (y>0        && this.bitmap[y-1][x] === this.color) this.algo(x,y-1)
  }
}

function flood_spread(x,y) {
  const MATCH = this.color, BLANK = ~this.color

  if (!this.$flood_spread_queue) this.$flood_spread_queue = []
  const q = this.$flood_spread_queue

  while(true) {
    if (this.bitmap[y][x] === MATCH) {

    this.pixels.set(`${x},${y}`, [x,y])

      this.bitmap[y][x] = BLANK

      if (x<this.w-1 && this.bitmap[y][x+1] === MATCH) q.push([x+1,y])
      if (y<this.h-1 && this.bitmap[y+1][x] === MATCH) q.push([x,y+1])
      if (x>0        && this.bitmap[y][x-1] === MATCH) q.push([x-1,y])
      if (y>0        && this.bitmap[y-1][x] === MATCH) q.push([x,y-1])
    }

    const next = q.shift()
    if (!next) return

    this.algo(next[0],next[1])
  }
}

})();
