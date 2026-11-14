const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0 (None)
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const srcOffset = y * width * 4;
    const dstOffset = y * (1 + width * 4);
    scanlines[dstOffset] = 0; // Filter: None
    rgbaBuffer.copy(scanlines, dstOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Read input Logo.png
const srcPath = path.resolve('Logo/Logo.png');
const fileBuf = fs.readFileSync(srcPath);

let pos = 8;
const idatChunks = [];
while (pos < fileBuf.length) {
  const len = fileBuf.readUInt32BE(pos);
  const type = fileBuf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IDAT') idatChunks.push(fileBuf.subarray(pos + 8, pos + 8 + len));
  pos += 12 + len;
}

const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const srcW = 3200;
const srcH = 3200;
const bpp = 4;
const srcStride = 1 + srcW * bpp;
const srcPixels = Buffer.alloc(srcW * srcH * bpp);

// Unfilter
for (let y = 0; y < srcH; y++) {
  const filter = raw[y * srcStride];
  const rowStart = y * srcStride + 1;
  const outRowStart = y * srcW * bpp;
  const prevOutRowStart = (y - 1) * srcW * bpp;

  for (let x = 0; x < srcW * bpp; x++) {
    const rawVal = raw[rowStart + x];
    const a = x >= bpp ? srcPixels[outRowStart + x - bpp] : 0;
    const b = y > 0 ? srcPixels[prevOutRowStart + x] : 0;
    const c = (y > 0 && x >= bpp) ? srcPixels[prevOutRowStart + x - bpp] : 0;
    let val = 0;
    if (filter === 0) val = rawVal;
    else if (filter === 1) val = (rawVal + a) & 0xff;
    else if (filter === 2) val = (rawVal + b) & 0xff;
    else if (filter === 3) val = (rawVal + Math.floor((a + b) / 2)) & 0xff;
    else if (filter === 4) {
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      val = (rawVal + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 0xff;
    }
    srcPixels[outRowStart + x] = val;
  }
}

// 2. Remove black background with smooth alpha anti-aliasing
// Find bounding box first
let minX = srcW, maxX = 0, minY = srcH, maxY = 0;
for (let y = 0; y < srcH; y++) {
  for (let x = 0; x < srcW; x++) {
    const idx = (y * srcW + x) * bpp;
    const r = srcPixels[idx], g = srcPixels[idx+1], b = srcPixels[idx+2];
    const maxV = Math.max(r, g, b);
    if (maxV > 12) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
console.log('Detected Logo Bounding Box:', { minX, maxX, minY, maxY });

// Add padding of 5% around bounding box, make it square
const contentW = maxX - minX + 1;
const contentH = maxY - minY + 1;
const maxDim = Math.max(contentW, contentH);
const pad = Math.round(maxDim * 0.04);
const targetSize = maxDim + pad * 2;

const centerX = Math.round((minX + maxX) / 2);
const centerY = Math.round((minY + maxY) / 2);
const cropStartX = Math.round(centerX - targetSize / 2);
const cropStartY = Math.round(centerY - targetSize / 2);

console.log('Square crop bounds:', { targetSize, cropStartX, cropStartY });

// Target resolution for crisp high-DPI display: 1200 x 1200
const outDim = 1200;
const outPixels = Buffer.alloc(outDim * outDim * 4);

// Bilinear sample with transparency processing
for (let outY = 0; outY < outDim; outY++) {
  const srcY = cropStartY + (outY / outDim) * targetSize;
  for (let outX = 0; outX < outDim; outX++) {
    const srcX = cropStartX + (outX / outDim) * targetSize;

    const x0 = Math.floor(srcX);
    const y0 = Math.floor(srcY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const fx = srcX - x0;
    const fy = srcY - y0;

    let r = 0, g = 0, b = 0;
    if (x0 >= 0 && x1 < srcW && y0 >= 0 && y1 < srcH) {
      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;

      r = (1 - fy) * ((1 - fx) * srcPixels[idx00] + fx * srcPixels[idx10]) +
          fy * ((1 - fx) * srcPixels[idx01] + fx * srcPixels[idx11]);
      g = (1 - fy) * ((1 - fx) * srcPixels[idx00+1] + fx * srcPixels[idx10+1]) +
          fy * ((1 - fx) * srcPixels[idx01+1] + fx * srcPixels[idx11+1]);
      b = (1 - fy) * ((1 - fx) * srcPixels[idx00+2] + fx * srcPixels[idx10+2]) +
          fy * ((1 - fx) * srcPixels[idx01+2] + fx * srcPixels[idx11+2]);
    }

    const maxV = Math.max(r, g, b);
    let alpha = 0;
    if (maxV <= 6) {
      alpha = 0;
      r = 0; g = 0; b = 0;
    } else if (maxV < 38) {
      // Smooth feathering on edges
      alpha = Math.round(((maxV - 6) / 32) * 255);
      const factor = 255 / maxV;
      r = Math.min(255, Math.round(r * factor));
      g = Math.min(255, Math.round(g * factor));
      b = Math.min(255, Math.round(b * factor));
    } else {
      alpha = 255;
      r = Math.round(r);
      g = Math.round(g);
      b = Math.round(b);
    }

    const outIdx = (outY * outDim + outX) * 4;
    outPixels[outIdx] = r;
    outPixels[outIdx + 1] = g;
    outPixels[outIdx + 2] = b;
    outPixels[outIdx + 3] = alpha;
  }
}

// Write the new transparent PNG
const newPngBuf = createPng(outDim, outDim, outPixels);
fs.writeFileSync('Logo/Logo.png', newPngBuf);
fs.writeFileSync('client/public/Logo.png', newPngBuf);
fs.writeFileSync('client/src/assets/Logo.png', newPngBuf);
console.log('Successfully generated transparent Logo.png (' + outDim + 'x' + outDim + ') size: ' + newPngBuf.length + ' bytes');
