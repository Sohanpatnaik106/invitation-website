import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { wedding } from '../src/content.ts'

const sourcePath = process.argv[2]
if (!sourcePath) throw new Error('Supply the Golden Garden Wedding Pavilion PNG path')
const source = await readFile(sourcePath)
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const assets = await page.evaluate(async data => {
    const image = new Image()
    image.src = `data:image/png;base64,${data}`
    await image.decode()
    return [32, 5].map(blur => {
      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = Math.round(canvas.width * image.naturalHeight / image.naturalWidth)
      const context = canvas.getContext('2d')
      context.fillStyle = '#381321'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.filter = `blur(${blur}px)`
      const bleed = 96
      const height = (canvas.width + bleed) * image.naturalHeight / image.naturalWidth
      context.drawImage(image, -bleed / 2, (canvas.height - height) / 2, canvas.width + bleed, height)
      return canvas.toDataURL('image/jpeg', .86).split(',')[1]
    })
  }, source.toString('base64'))
  for (const [index, path] of Object.values(wedding.venueArtwork).entries()) {
    const bytes = Buffer.from(assets[index], 'base64')
    if (bytes.length < 1000 || bytes.length > 150000) throw new Error(`Invalid venue artwork size: ${path}`)
    await writeFile(`public${path}`, bytes)
    console.log(`${path}: ${bytes.length} bytes, pre-rendered soft focus`)
  }
} finally {
  await browser.close()
}