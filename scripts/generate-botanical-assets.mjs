import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const sourceUrl = 'https://upload.wikimedia.org/wikipedia/commons/d/db/Pierre_Joseph_Redout%C3%A9_._Rose_MNHA.jpg'
const source = process.argv[2] ? await readFile(process.argv[2]) : Buffer.from(await (await fetch(sourceUrl)).arrayBuffer())
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  const assets = await page.evaluate(async data => {
    const image = new Image()
    image.src = `data:image/jpeg;base64,${data}`
    await image.decode()
    const study = document.createElement('canvas')
    study.width = 670
    study.height = 940
    const context = study.getContext('2d')
    context.drawImage(image, 0, 0, 670, 940)
    const mask = new Path2D('M204 163 C230 155 237 113 254 133 L265 185 L267 246 L263 281 L244 281 L239 231 L208 211 Z M278 151 C301 135 323 137 342 124 C369 114 400 133 420 161 C461 157 484 190 482 225 C502 253 474 293 452 309 C450 344 414 370 379 371 C353 376 338 353 329 344 C296 351 279 324 279 300 C251 279 262 250 273 232 C260 202 269 176 278 151 Z M104 319 C121 296 154 301 165 331 C182 337 183 364 168 384 L145 405 L124 389 L94 374 Z M155 366 C189 348 250 349 277 378 L308 393 L332 353 L368 346 L394 368 L416 367 C422 348 454 327 483 333 C518 330 548 357 557 384 L578 401 L569 431 L606 440 L636 474 L615 500 L574 498 L551 529 L510 534 L469 523 L451 495 L428 496 L410 450 L375 444 L344 487 L341 543 L390 551 L425 564 L441 586 L468 605 L459 621 L421 638 L393 670 L367 707 L340 684 L311 661 L286 662 L269 702 L255 727 L245 761 L257 791 L243 841 L228 838 L240 783 L252 745 L266 710 L271 672 L240 672 L206 694 L210 658 L197 612 L174 590 L150 600 L119 592 L100 610 L83 603 L89 574 L81 566 L95 544 L137 513 L181 502 L228 514 L263 548 L292 553 L316 535 L319 480 L298 459 L272 483 L232 482 L205 461 L194 438 L172 422 L140 415 L137 393 Z')
    context.globalCompositeOperation = 'destination-in'
    context.fill(mask)
    const studyPixels = context.getImageData(0, 0, 670, 940)
    for (let offset = 0; offset < studyPixels.data.length; offset += 4) {
      const horizontal = offset / 4 % 670
      const vertical = Math.floor(offset / 4 / 670)
      const mainBloom = ((horizontal - 374) / 107) ** 2 + ((vertical - 249) / 120) ** 2 < 1
      const smallBloom = ((horizontal - 493) / 69) ** 2 + ((vertical - 410) / 83) ** 2 < 1
      if (mainBloom || smallBloom) continue
      const maximum = Math.max(...studyPixels.data.subarray(offset, offset + 3))
      const minimum = Math.min(...studyPixels.data.subarray(offset, offset + 3))
      const saturation = (maximum - minimum) / Math.max(1, maximum)
      const coverage = Math.max((saturation - .06) / .12, (200 - minimum) / 70)
      studyPixels.data[offset + 3] *= Math.max(0, Math.min(1, coverage))
    }
    context.putImageData(studyPixels, 0, 0)
    const canopy = document.createElement('canvas')
    canopy.width = 1200
    canopy.height = 220
    const flowers = canopy.getContext('2d')
    flowers.translate(500, 30)
    flowers.rotate(Math.PI / 2 - .15)
    flowers.drawImage(study, 0, 0, 670, 940, -167, -235, 335, 470)
    const petal = document.createElement('canvas')
    petal.width = 64
    petal.height = 88
    const detail = petal.getContext('2d')
    detail.drawImage(image, 340 * image.naturalWidth / 670, 272 * image.naturalHeight / 940, 55 * image.naturalWidth / 670, 65 * image.naturalHeight / 940, 0, 0, 64, 88)
    detail.globalCompositeOperation = 'destination-in'
    detail.fill(new Path2D('M31 3 C52 4 63 24 58 46 C54 65 38 78 18 86 C6 68 2 48 7 28 C11 13 18 5 31 3 Z'))
    return [canopy, petal].map(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
      let visible = 0
      for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset] > 10) visible++
      return { png: canvas.toDataURL('image/png').split(',')[1], coverage: visible / (canvas.width * canvas.height) }
    })
  }, source.toString('base64'))
  await mkdir('public/media', { recursive: true })
  for (const [index, name] of ['botanical-canopy.png', 'rose-petal.png'].entries()) {
    const asset = assets[index]
    if (asset.coverage <= .01 || asset.coverage >= .95) throw new Error(`Invalid transparent asset: ${name}`)
    const pixels = Buffer.from(asset.png, 'base64')
    await writeFile(`public/media/${name}`, pixels)
    console.log(`${name}: ${pixels.length} bytes, ${(asset.coverage * 100).toFixed(1)}% visible`)
  }
} finally {
  await browser.close()
}