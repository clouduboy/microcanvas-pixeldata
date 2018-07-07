canvas = document.querySelector('canvas.source')
ctx = canvas.getContext('2d')
/*
let src = normalize([
  [0  ,1,1,1,1,1,1,1,1,  0],
  [0  ,1, , , , , , ,1,  0],
  [0  ,1, , , , , , ,1,  0],
  [0  ,1, , , , , , ,1,  0],
  [0  ,1,1,1,1,1,1,1,1,  0],
  [0  ,1,1,1,1,1,1,1,1,  0],
  [0  ,1,1, ,1,1,1, ,1,  0],
  [0  ,1, , , ,1, ,1,1,  0],
  [0  ,1,1, ,1,1,1,1,1,  0],
  [0  ,1,1,1,1,1,1,1,1,  0]
])*/

const icons = [
`
! paint-button 10x10
.####.....
.#..#..#..
.#..#.###.
.#.....#..
.#.###....
.#.#.##...
...#####..
....#####.
.....####.
......##..
`,`
! gameboy 10x10
.########.
.#......#.
.#......#.
.#......#.
.########.
.########.
.##.###.#.
.#...#.##.
.##.#####.
.########.
`,`
! in_or_out 10x10
..........
..........
...####...
..######..
..##..##..
..##..##..
..######..
...####...
..........
..........
`,`
! in_or_out 10x10

..........
...####...
..######..
..##..##..
..##..##..
.########.
.########.
.##....##.
####..####
..........
`,
]

let src = normalize(new PixelData(icons[3]).bitmap)


findpixels(src, 1)


paint(src)

showsvg(src, 'hotpink')
showsvg(src, 'pink', { method: bitmap2svg_scanline } )
showsvg(src, 'crimson', { method: bitmap2svg_edgetrace } )

selectpixels(src, 1,0)

selectpixels(src, 1,0, 'skyblue', { algo: flood_rdlu } )

selectpixels(src, 1,0, 'orange', { algo: flood_spread })
selectpixels(src, 8,8, 'brown', { algo: flood_spread })

selectpixels(src, 6,6, 'yellow', { algo: flood_rdlu, continuous:false })
selectpixels(src, 6,6, 'cyan', { algo: flood_spread, continuous:false })
selectpixels(src, 1,1, 'lime', { algo: flood_spread, continuous:false })



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

  console.log('SVG data length: ', img.src.length)
}

function tosvg(bitmap, color='currentcolor', options = {}) {
  const impl = options.method || bitmap2svg_naive
  const w = bitmap[0].length, h = bitmap.length

  const result = impl({ bitmap, color, w, h })

  console.log(impl.name||impl.toString(), result.length)

  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' ${ /*further="svg-options" > <path-s/> */ result }/></svg>`
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

  return `fill="${options.color}" fill-rule="evenodd"><path d='${path.join(' ')}'`
}

// Scanline: same as naive, but horizontal pixel runs
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

  return `fill="${options.color}" fill-rule="evenodd"><path d='${path.join(' ')}'`
}

// Edge Trace: tries to trace object edges
function bitmap2svg_edgetrace(options) {
  const path = []
  let x = 0, y = 8

  const b = options.bitmap
  const pixel = (x,y) => {
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return undefined;
    return b[y][x]
  }

  // path.push(`M${x} ${y}h1v1h-1z`)
  const sx = x, sy = y
  path.push(`M${x} ${y}`)

  // initial direction could be right, up  or down
  path.push(`h1`)
  let d = 'r'

  while (pixel(x,y)) {
    console.log(x,y,d)

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
        path.push(`h+1`)
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
      path.push(`L9 9z`)
      x = y = -1 // will break the loop
    }

    if (x == sx && y == sy) break
  }


  return `fill="${options.color}" fill-rule="evenodd"><path d='${path.join('')}'`
}



function svgdataurl(svg) {
  return `data:image/svg+xml,${svg.replace(/</g,'%3C').replace(/>/g,'%3E')}`
}

function normalize(bitmap) {
  const norm = []
  bitmap.forEach(row => norm.push(Array.from(row, i => i?i:0)))
  return norm
}

function selectpixels(bitmap, x,y, paintcolor='red', algoopts) {
  const sel = getselection(bitmap, x,y, algoopts)

  const selc = document.createElement('canvas')
  const sc = selc.getContext('2d')

  selc.width = sel.w
  selc.height = sel.h

  sc.fillStyle = paintcolor

  let p = 0
  const phase = sel.pixels.length
  const phasecallback = () => {
    p++
    if (p>=phase) {
      p= -30
    }

    if (p>=0) {
      sc.clearRect(0,0,sel.w,sel.h)
      for (let i = 0; i <= p; ++i) {
        const [x,y] = sel.pixels[i].split(',').map(n => parseInt(n,10))
        sc.fillRect(x,y,1,1)
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

function getselection(source, sx,sy, options = {}) {
  const bitmap = JSON.parse(JSON.stringify(normalize(source)))
  const s = {
    // clone source, operate on a duplicate
    bitmap: bitmap,
    w: bitmap[0].length,
    h: bitmap.length,
    pixels: [],
    algo: options.algo || flood_lrud,
    continuous: typeof options.continuous == 'undefined' ? true : !!options.continuous,
    color: options.color || 1
  }

  s.algo(sx,sy)

  if (!s.continuous) {
    const morepixels = findpixels(s.bitmap, 1)
    console.log(morepixels.length, 'remain of', findpixels(source, 1).length, 'px')
    console.log(morepixels)

    if (morepixels.length) {
      const nextpixel = morepixels[morepixels.length>>1]
      const subsel = getselection(s.bitmap, nextpixel [0], nextpixel  [1], options)
      return Object.assign(subsel, { pixels: s.pixels.concat(subsel.pixels)})
    }
  }

  console.log(stringify(source))
  console.log(s)

  return s
}


function flood_lrud(x,y) {
  if (this.bitmap[y][x]) {

    this.pixels.push(`${x},${y}`)

    this.bitmap[y][x] = 0

    if (x>0        && this.bitmap[y][x-1] === this.color) this.algo(x-1,y)
    if (x<this.w-1 && this.bitmap[y][x+1] === this.color) this.algo(x+1,y)
    if (y>0        && this.bitmap[y-1][x] === this.color) this.algo(x,y-1)
    if (y<this.h-1 && this.bitmap[y+1][x] === this.color) this.algo(x,y+1)
  }
}

function flood_rdlu(x,y) {
  if (this.bitmap[y][x]) {

    this.pixels.push(`${x},${y}`)

    this.bitmap[y][x] = 0

    if (x<this.w-1 && this.bitmap[y][x+1] === this.color) this.algo(x+1,y)
    if (y<this.h-1 && this.bitmap[y+1][x] === this.color) this.algo(x,y+1)
    if (x>0        && this.bitmap[y][x-1] === this.color) this.algo(x-1,y)
    if (y>0        && this.bitmap[y-1][x] === this.color) this.algo(x,y-1)
  }
}

function flood_spread(x,y) {
  if (!this.$flood_spread_queue) this.$flood_spread_queue = []
  const q = this.$flood_spread_queue

  while(true) {
    if (this.bitmap[y][x]) {

      this.pixels.push(`${x},${y}`)

      this.bitmap[y][x] = 0

      if (x<this.w-1 && this.bitmap[y][x+1] === this.color) q.push([x+1,y])
      if (y<this.h-1 && this.bitmap[y+1][x] === this.color) q.push([x,y+1])
      if (x>0        && this.bitmap[y][x-1] === this.color) q.push([x-1,y])
      if (y>0        && this.bitmap[y-1][x] === this.color) q.push([x,y-1])
    }

    const next = q.shift()
    if (!next) return

    this.algo(next[0],next[1])
  }
}
