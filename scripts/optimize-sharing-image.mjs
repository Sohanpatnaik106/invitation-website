import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const [sourcePath, outputPath] = process.argv.slice(2)
if (!sourcePath || !outputPath) throw new Error('Usage: node scripts/optimize-sharing-image.mjs source.png output.jpg')
const source = await readFile(sourcePath)
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const asset = await page.evaluate(async data => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(1200, image.naturalWidth)
    canvas.height = Math.round(canvas.width * image.naturalHeight / image.naturalWidth)
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [.86, .8, .72, .65]) {
      const jpeg = canvas.toDataURL('image/jpeg', quality).split(',')[1]
      if (atob(jpeg).length < 250000) return { jpeg, width: canvas.width, height: canvas.height, quality }
    }
    throw new Error('Sharing JPEG exceeds the 250 KB target')
  }, source.toString('base64'))
  const bytes = Buffer.from(asset.jpeg, 'base64')
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Invalid JPEG output')
  await writeFile(outputPath, bytes)
  console.log(JSON.stringify({ outputPath, bytes: bytes.length, width: asset.width, height: asset.height, quality: asset.quality }))
} finally {
  await browser.close()
}