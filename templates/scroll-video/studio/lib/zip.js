/* A minimal ZIP writer — store only, no compression.
   Everything we pack (WebP frames, PNG logos) is already compressed, so deflate
   would cost CPU to save nothing. This is why the studio needs no dependencies. */

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32 (bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/* DOS date/time — a fixed, sane timestamp beats a wrong one. */
function dosTime (d = new Date()) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  }
}

class Writer {
  constructor () { this.parts = []; this.length = 0 }
  push (bytes) { this.parts.push(bytes); this.length += bytes.length }
  u32 (v) { this.push(new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255])) }
  u16 (v) { this.push(new Uint8Array([v & 255, (v >>> 8) & 255])) }
}

/**
 * @param {Array<{name:string, data:Uint8Array|ArrayBuffer|Blob|string}>} files
 * @returns {Promise<Blob>}
 */
export async function makeZip (files) {
  const enc = new TextEncoder()
  const entries = []
  for (const f of files) {
    let data = f.data
    if (typeof data === 'string') data = enc.encode(data)
    else if (data instanceof Blob) data = new Uint8Array(await data.arrayBuffer())
    else if (data instanceof ArrayBuffer) data = new Uint8Array(data)
    entries.push({ name: enc.encode(f.name), data })
  }

  const { time, date } = dosTime()
  const out = new Writer()
  const central = []

  for (const e of entries) {
    const offset = out.length
    const crc = crc32(e.data)
    out.u32(0x04034b50); out.u16(20); out.u16(0); out.u16(0)
    out.u16(time); out.u16(date)
    out.u32(crc); out.u32(e.data.length); out.u32(e.data.length)
    out.u16(e.name.length); out.u16(0)
    out.push(e.name); out.push(e.data)
    central.push({ e, crc, offset })
  }

  const cdStart = out.length
  for (const { e, crc, offset } of central) {
    out.u32(0x02014b50); out.u16(20); out.u16(20); out.u16(0); out.u16(0)
    out.u16(time); out.u16(date)
    out.u32(crc); out.u32(e.data.length); out.u32(e.data.length)
    out.u16(e.name.length); out.u16(0); out.u16(0)
    out.u16(0); out.u16(0); out.u32(0); out.u32(offset)
    out.push(e.name)
  }
  const cdSize = out.length - cdStart

  out.u32(0x06054b50); out.u16(0); out.u16(0)
  out.u16(entries.length); out.u16(entries.length)
  out.u32(cdSize); out.u32(cdStart); out.u16(0)

  return new Blob(out.parts, { type: 'application/zip' })
}

export function download (blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
