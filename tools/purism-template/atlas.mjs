import { deflateSync } from "node:zlib";
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    body = Buffer.concat([name, data]);
  const header = Buffer.alloc(4),
    footer = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  footer.writeUInt32BE(crc32(body));
  return Buffer.concat([header, body, footer]);
}
export function encodeAtlas(meshes) {
  if (!Array.isArray(meshes) || meshes.length < 1 || meshes.length > 64)
    throw new Error("atlas mesh count out of bounds");
  const width = meshes.length * 8,
    height = 8;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = meshes[Math.floor(x / 8)].color;
      if (!/^#[0-9a-fA-F]{6}$/.test(color))
        throw new Error("invalid atlas color");
      const off = y * (width * 4 + 1) + 1 + x * 4;
      raw[off] = parseInt(color.slice(1, 3), 16);
      raw[off + 1] = parseInt(color.slice(3, 5), 16);
      raw[off + 2] = parseInt(color.slice(5, 7), 16);
      raw[off + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
