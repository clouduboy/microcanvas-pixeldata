/* PixelData manipulation and storage library
*/
(function() {

function PixelData(input) {
  this.bitmap;

  // Could be serialized JSON
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch (e) {
      // don't fret, could still be a PIF
    }
  }

  // Object, should have w/h set and some data field
  // If object data is not byte data continue with that data as input
  if (typeof input === 'object' && input.data instanceof Array) {
    if (typeof input.data[0] === 'number') {
      this.bitmap = bytes2bitmap(input.data, input.w, input.h);
      this.w = this.bitmap[0].length;
      this.h = this.bitmap.length;
      this.id = input.id;
      return;
    } else {
      input = input.data;
    }
  }

  // String, try parsing as PIF
  if (typeof input === 'string') {
    try {
      this.bitmap = pif2bitmap(input);
      this.w = this.bitmap[0].length;
      this.h = this.bitmap.length;

      // Try to read embedded id tag
      try {
        this.id = input.match(/\:(\w+)/)[1];
      } catch (e) {
        console.log('No embedded id found in PIF string');
      }
      return;

    } catch (e) {
      console.log('Invalid PIF data!');
      throw e;
    }
  }

  // Nested array - should be a bitmap already
  if (input instanceof Array && input[0] instanceof Array) {
    this.bitmap = input;
    this.w = this.bitmap[0].length;
    this.h = this.bitmap.length;
    return;
  }

}

PixelData.prototype = {
  get pif() {
    return bitmap2pif(this.bitmap, this.id);
  },
  get bytes() {
    return bitmap2bytes(this.bitmap);
  },
  get sprite() {
    return this.bytes.reduce(function(sprite, v) {
      return sprite += (sprite === '' ? '' : ', ') + ( v<16 ? '0x0' : '0x' ) + v.toString(16);
    }, '');
  },

  // Compare two PixelData objects
  equals: function(other) {
    try {
      return this.pif === other.pif;
    } catch (e) {
      console.log("Error matching PixelData: ", e);
      return false;
    }
  },

  // Create an object with all properties
  serialize: function() {
    return {
      id: this.id,
      w: this.w,
      h: this.h,
      data: this.bytes
    };
  }
}


function bitmap2pif(bitmap, id) {
  return (id ? ':' + id + ':\n' : '') +
    bitmap.reduce(function(out,row) {
      out.push(row.join(''));
      return out;
    },[]).join('\n').replace(/0/g,'.').replace(/1/g,'#');
}

function pif2bitmap(pif) {
  var rows = pif.replace(/[^\.\#]+/g,' ').trim().split(/\s+/g);

  var matrix = rows.map(function(s) {
    var i,
        r = [];

    for (i = 0; i < s.length; ++i) {
      r.push(s[i] === '#' ? 1 : 0);
    }

    return r;
  });

  return matrix;
}

function pif2bytes(pif) {
  return bitmap2bytes( pif2bitmap( pif ));
}

function bitmap2bytes(bitmap) {
  var x,y,seg,ymax,v;
  var w = bitmap[0].length, h = bitmap.length;
  var bytes = [];

  seg = 0;
  while (seg < h) {
    for (x = 0; x < w; ++x) {
      v = 0;
      ymax = (h-seg < 8 ? h-seg : 8);

      for (y = 0; y < ymax; ++y) {
        v |= bitmap[seg+y][x] << y;
      }

      // Save byte values
      bytes.push(v);
    }

    seg += 8;
  }

  return bytes;
}

function bytes2bitmap(bytes,w,h) {
  // Width / height optional, assume square image @ 8x8 or multiples
  if (!h) {
    h = w;
  }
  if (!w || (w * Math.ceil(h/8)) < bytes.length) {
    w = h = Math.ceil( Math.sqrt( bytes.length / 8) ) * 8;
  }

  var x,y;
  var bitmap = [];
  for (y = 0; y<h; ++y) {
    bitmap[y] = [];
    for (x = 0; x<w; ++x) {
      bitmap[y][x] = (bytes[(y >> 3) * w + x] & (1 << (y % 8))) ? 1 : 0;
    }
  }

  return bitmap;
}

function bytes2pif(bytes,w,h,id) {
  return bitmap2pif( bytes2bitmap(bytes,w,h), id );
}

/*
GLOBAL.fromBitmap = bitmap2pif;
GLOBAL.toBitmap = pif2bitmap;

GLOBAL.fromBytes = bytes2pif;
GLOBAL.toBytes = pif2bytes;
*/

try {
  window.PixelData = PixelData;
} catch (e) {
  module.exports = PixelData;
}

})(); // IIFE
