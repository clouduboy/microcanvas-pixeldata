(function(){
  'use strict'


  // Sidebar utility
  self.sidebar = (function() {
    const sidebarEmt = document.querySelector('.sidebar > .logs')
    return ({
      log(msg, type) {
        let e = document.createElement('div');
        e.textContent = msg;
        if (type) e.className = type;
        sidebarEmt.appendChild(e);
      },
      clearLog() {
        Array.from(sidebarEmt.children).forEach( e => sidebarEmt.removeChild(e) )
      },
    })
  })()


  // Load list of examples
  fetch('examples.json')
    .then(r => r.json())
    // Fetch PIF files for examples
    .then(examples => {
      return Promise.all(examples.map(
        bitmap => fetch('../examples/'+bitmap)
          .then(r => r.text())
          .then(pif => ({ [bitmap]: pif }) )
        ))
    })
    // Assemble examples object
    .then(bitmaps => bitmaps.reduce(
      ( (obj, bitmap) => Object.assign(obj, bitmap) )
      , {}))
    .then(examples => {
    window.examples = examples

    document.querySelector('select').innerHTML = (
      Object.keys(examples).map(l => `<option>${l}</option>`).join('')
    )

    load(dropdown.value)
  }).catch(err => console.log('[!] Cannot load built-in examples! ', err))

  const editor = CodeMirror.fromTextArea(
    document.getElementById("codeeditor"),
    {
      theme: "night",
      tabsize: 2,
      lineNumbers: true,
      lineWrapping: true,
      viewportMargin: Infinity,
    }
  )

  const framestrip = document.getElementById('framestrip').getContext('2d')

  const dropdown = document.querySelector('select')
  dropdown.addEventListener('change', _ => load(dropdown.value))

  editor.on('change', update)

  document.querySelector('canvas').classList.add('microcanvas');

  const mc = new MicroCanvas(framestrip)

  window.editor = editor
  window.examples = window.examples || {}

  window.currentFrame = 0
  window.currentSprite
  setInterval(_ => {
    let s = window.currentSprite, px = s.pixeldata
    const fr = window.currentFrame
    let frame = fr % (s.length||1)

    // Color sprites
    if (px.bpp > 1) {
      // Multicolor sprite
      if (px.palette && px.palette.length > 2) {
        if (fr % 6 === 0) {
          // Display with original color palette
          window.currentSprite = s = mc.loadSprite(s.pixeldata.$host || s.pixeldata)

        // Display with greyscale palette
      } else if (fr % 6 === 3){
          window.currentSprite = s = mc.loadSprite(s.pixeldata.grayscale())
        }

        framestrip.clearRect(0,0, framestrip.width,framestrip.height)
        framestrip.drawImage(s[frame], 0,0)


      // Greyscale C-sprite
      } else if (px.palette && px.palette.length == 2) {
        // Draw frames on top of each other
        window.currentSprite = s = mc.loadSprite(px.colors( [ [0,0,0,0], [255,255,255,64] ] ))

        framestrip.globalCompositeOperation = 'lighter';

        // Only clear for first frame
        if (fr % 4 === 0) {
          framestrip.clearRect(0,0, framestrip.width,framestrip.height)
        }

        if (frame>2) framestrip.drawImage(s[3], 0,0)
        if (frame>1) framestrip.drawImage(s[2], 0,0)
        if (frame>0) framestrip.drawImage(s[1], 0,0)
        framestrip.drawImage(s[0], 0,0)
      }

    } else {
      framestrip.clearRect(0,0, framestrip.width,framestrip.height)
      framestrip.drawImage(s[frame], 0,0)
    }

    window.currentFrame++
  }, 700)

  function load(label) {
    let val = trimmed(window.examples[label]) || Object.values(window.examples)[0]

    editor.setValue(val)
  }

  function update() {
    parse(trimmed(editor.getValue()))
  }
  function parse(str) {
    sidebar.clearLog()

    const sprite = mc.loadSprite(str)
    const px = sprite.pixeldata

    console.log(px.id, sprite, sprite.pixeldata)

    sidebar.log(px.id||'?')
    sidebar.log(`${px.w}×${px.h} pixels`)
    if (px.frames) sidebar.log(px.frames+' frames')
    if (px.palette>1) sidebar.log(px.bpp+' bits per pixel ('+(1<<(px.bpp-1))+' colors)')

    window.currentSprite = sprite
    window.currentFrame = 0
  }

  function trimmed(str) {
    let s = (typeof str==='object' && str[0]) ? str[0] : str

    if (!s) return ''
    return s.split(/\n/).map(e => e.trim()).join('\n').trim()
  }
})()
