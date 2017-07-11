# PIF - Pixeldata Image Format
JavaScript library for handling different pixeldata formats and creating easing
the creation of monochrome pixelart for embedded devices's displays, such as the
[Arduboy](//github.com/arduboy/arduboy) Arduino-based gaming device and others.

## What is a PIF?
PIF is short for `P`ixeldata `I`mage `F`ormat, a plain-text-based intermediary
format to facilitate the creation and sharing of low-resolution, monochrome
image data.

These images are most frequently used in tiny, DIY LCD/LED/OLED displays in
conjunction with small embedded hardware. Creating such images should be
straightforward, but is hindered by the missing simple tooling and the
output requirement of a non-trivial binary pixelformat.

## How to use?
_coming soon_

## Changelog
- 0.1.5 (2016.07.17) Fix bitmap loading
  - fix multiframe bitmap loading
- 0.1.4 (2016.07.13) Frames support
  - add `.frames` support
- 0.1.3 (2016.02.18) Fix dimensions heuristics
  - fix heuristics of guessing pixelsprite dimensions
- 0.1.2 (2016.02.07) RGBA support
  - add `bitmapToRgba()` conversion
  - add `.rgba` output format
- 0.1.1 (2015.05.03) BMP-import support for
  - support for loading BMP bitmaps (1bit,24bit,32bit)
- 0.1.0 (2015.05.02) Initial release
