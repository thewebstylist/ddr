/* Video -> frame sequence, entirely in the browser.
   The file never leaves the machine: it becomes an object URL, which is
   same-origin, so the canvas we read frames back out of is never tainted. */

export const FORMATS = {
  webp: { mime: 'image/webp', ext: 'webp' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg' }
}

/* canvas.toBlob is specified to fall back to PNG when it cannot encode the type
   you asked for — silently. Naming that PNG ".webp" would ship files whose
   extension, MIME type and actual bytes all disagree, so probe first. */
export function encoderFor (format) {
  const want = (FORMATS[format] || FORMATS.webp).mime
  const c = document.createElement('canvas')
  c.width = c.height = 1
  const got = c.toDataURL(want)
  return got.startsWith('data:' + want) ? format : 'jpeg'
}

export function readVideo (file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    v.src = url
    v.onloadedmetadata = () => resolve({ video: v, url, duration: v.duration, width: v.videoWidth, height: v.videoHeight })
    v.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This browser could not decode that file. MP4 (H.264) and WebM are the safe choices.'))
    }
  })
}

const seekTo = (v, t) => new Promise((resolve) => {
  const done = () => { v.removeEventListener('seeked', done); resolve() }
  v.addEventListener('seeked', done)
  v.currentTime = t
})

/**
 * Seek-and-capture. Slower than playing the video through, and exact — we get
 * the frame count we asked for, evenly spaced, every time.
 *
 * @returns {Promise<Array<{blob:Blob,url:string}>>}
 */
export async function extractFrames (file, opts = {}) {
  const { count = 160, width = 1440, format = 'webp', quality = 0.78, onProgress } = opts
  const useFormat = encoderFor(format)
  const { video, url, duration, width: vw, height: vh } = await readVideo(file)
  if (!vw || !vh) { URL.revokeObjectURL(url); throw new Error('That file reports no picture size.') }

  const w = Math.min(width, vw)
  const h = Math.round(w * vh / vw)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: false })
  const mime = FORMATS[useFormat].mime

  const frames = []
  try {
    for (let i = 0; i < count; i++) {
      /* Stop a hair short of the end: the last sample is often not decodable. */
      const t = (i / (count - 1)) * Math.max(0, duration - 0.05)
      await seekTo(video, t)
      ctx.drawImage(video, 0, 0, w, h)
      const blob = await new Promise((r) => canvas.toBlob(r, mime, quality))
      if (!blob) throw new Error('The browser refused to encode a frame.')
      frames.push({ blob, url: URL.createObjectURL(blob) })
      if (onProgress) onProgress((i + 1) / count, i + 1, count)
    }
  } finally {
    URL.revokeObjectURL(url)
    video.src = ''
  }
  return { frames, width: w, height: h, duration, format: useFormat }
}

/* An image sequence the user already has — exported from After Effects, Blender,
   a render farm. Sorted by the natural number in the filename, so frame 9 comes
   before frame 10. */
export async function importSequence (fileList) {
  const files = [...fileList]
    .filter((f) => /^image\//.test(f.type))
    .sort((a, b) => {
      const na = +(a.name.match(/(\d+)(?=\D*$)/) || [0, 0])[1]
      const nb = +(b.name.match(/(\d+)(?=\D*$)/) || [0, 0])[1]
      return na - nb || a.name.localeCompare(b.name)
    })
  return files.map((f) => ({ blob: f, url: URL.createObjectURL(f) }))
}

export function releaseFrames (frames) {
  frames.forEach((f) => { if (f.url) URL.revokeObjectURL(f.url) })
}

/* Bytes, for the warning that stops someone shipping a 90 MB hero. */
export const totalBytes = (frames) => frames.reduce((n, f) => n + (f.blob.size || 0), 0)
