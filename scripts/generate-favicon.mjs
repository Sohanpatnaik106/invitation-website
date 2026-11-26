import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { wedding } from '../src/content.ts'

const source = await readFile(`public${wedding.metadata.favicon}`)
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const raster = await page.evaluate(async svg => {
    const image = new Image()
    image.src = `data:image/svg+xml;base64,${svg}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    canvas.getContext('2d').drawImage(image, 0, 0, 32, 32)
    return canvas.toDataURL('image/png').split(',')[1]
  }, source.toString('base64'))
  const png = Buffer.from(raster, 'base64')
  const header = Buffer.alloc(22)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header[6] = 32
  header[7] = 32
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(png.length, 14)
  header.writeUInt32LE(header.length, 18)
  await writeFile(`public${wedding.metadata.fallbackIcon}`, Buffer.concat([header, png]))
  console.log(`favicon.ico: ${header.length + png.length} bytes, 32 x 32 PNG-backed ICO`)
} finally {
  await browser.close()
}