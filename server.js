var koa = require('koa');
koaBody   = require('koa-body');

var fs = require('fs');
var app = koa();

var bitmaps;

var currentBitmapId = 'dino_top';

function currentBitmap() {
  for (var i=0; i<bitmaps.length; ++i) {
    if (bitmaps[i].id === currentBitmapId) return bitmaps[i];
  }

  return null;
}

reset();



app.use(koaBody({formidable:{uploadDir: __dirname}}));

app.use(function *() {
  console.log(this.path);

  // No favicon
  if (this.path === '/favicon.ico') {
    this.status = 404;
    return;
  }

  // Set current image and reload
  if (this.path.substr(0,5) === '/set/') {
    currentBitmapId = this.path.substr(5);
    reset();
  }

  // Update bitmap
  if (this.path === '/reset') {
    this.type = "text/plain";
    this.body = "OK";

    reset();
    return;
  }

  // Update bitmap
  if (this.path === '/update' && this.is('application/json')) {
    this.type = "text/plain";
    this.body = "OK";

    // TODO: multiple bitmap handling
    bitmaps[0] = this.request.body;

    console.log(bitmap2pif(bitmaps[0].data));
    return;
  }

  // Reload UI
  ui = fs.readFileSync('ui.html').toString();


  // Serve up-to-date bitmap string
  // TODO: multiple bitmap_id handling
  if (this.path === '/get') {
    this.type = 'application/json';
    this.body = JSON.stringify(bitmaps[0]);
    return;
  }

  // Serve UI
  this.type = 'text/html';
  this.body = ui
    .replace(/\[\/\*BITMAP\*\/\]/g, JSON.stringify(currentBitmap()) );

  console.log(bitmap2pif(currentBitmap().data));
});

app.listen(80);




function reset() {
  var newbitmap = pif2bitmap( fs.readFileSync('./sprites/' +currentBitmapId+ '.txt').toString() );

  bitmaps = [{
    id: currentBitmapId,
    w: newbitmap[0].length, h: newbitmap.length,
    data: newbitmap
  }];
}

function clear() {

}

function bitmap2pif(bitmap, name) {
  return (name ? "$"+name+"\n" : "") +
    bitmap.reduce(function(out,row) {
      out.push(row.join(''));
      return out;
    },[]).join('\n').replace(/0/g,'.').replace(/1/g,'#');
}

function pif2bitmap(pif) {
  var rows = pif.replace(/[^\.\#]+/g," ").trim().split(/\s+/g);

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
