var input = (function(){/*PIF
  ...######...
  ..#......#..
  .#........#.
  .#.#....#.#.
  .#........#.
  .#........#.
  .#.#....#.#.
  .#..####..#.
  ..#......#..
  ...######...
*/}).toString();

console.log(process.argv);

if (process.argv[2]) {
  input = require("fs").readFileSync(process.argv[2]).toString();
}

var rows = input.replace(/[^\.\#]+/g," ").trim().split(/\s+/g);

var matrix = rows.map(function(s) {
  var i,
      r = [];

  for (i = 0; i < s.length; ++i) {
    r.push(s[i] === '#' ? 1 : 0);
  }

  return r;
});

console.log(matrix);

var x,y,seg,ymax,v;
var w = matrix[0].length, h = matrix.length;
var sprite = [];

seg = 0;
while (seg < h) {
  for (x = 0; x < w; ++x) {
    v = 0;
    ymax = (h-seg < 8 ? h-seg : 8);

    for (y = 0; y < ymax; ++y) {
      v |= matrix[seg+y][x] << y;
    }

    sprite.push((v<16?"0x0":"0x")+v.toString(16));
  }

  seg += 8;
}

console.log("// w: ",w," h: ",h);
console.log("{ " +sprite.join(", ")+ " }");
