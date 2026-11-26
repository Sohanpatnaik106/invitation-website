import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const phoneViewports = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 },
]

test('sharing metadata keeps invitation details private before entry', async ({ page, request }) => {
  await page.route('**/src/main.tsx*', route => route.abort())
  for (const path of ['/', '/aastha', '/sohan']) {
    const response = await request.get(path)
    expect(response.ok()).toBe(true)
    expect(await response.text()).toContain('<title>An Invitation to Celebrate</title>')
    await page.goto(path)
    await expect(page).toHaveTitle('An Invitation to Celebrate')
    const head = await page.locator('head').innerHTML()
    expect(head).not.toMatch(/Aastha|Sohan|January|2027|Green Heaven|Bhubaneswar|aastheticsohlmates/i)
    for (const key of ['description', 'og:description', 'twitter:description']) {
      await expect(page.locator(`meta[name="${key}"], meta[property="${key}"]`)).toHaveAttribute('content', "An invitation to celebrate with our families. Open to discover what's inside.")
    }
    for (const key of ['og:title', 'twitter:title']) {
      await expect(page.locator(`meta[name="${key}"], meta[property="${key}"]`)).toHaveAttribute('content', 'An Invitation to Celebrate')
    }
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
    const imageUrl = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(imageUrl).toBeTruthy()
    expect(imageUrl).toMatch(/\/media\/celebration-awaits\.jpg$/)
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', imageUrl!)
    await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', 'image/jpeg')
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200')
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '675')
    for (const selector of ['meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]']) {
      await expect(page.locator(selector)).toHaveAttribute('content', 'An SA wax seal on burgundy velvet, framed by gold foliage, with the words A celebration awaits.')
    }
    const imageResponse = await request.get(imageUrl!, {
      headers: { 'User-Agent': 'WhatsApp/2.23.20.0', Range: 'bytes=0-2097151' },
    })
    expect(imageResponse.ok()).toBe(true)
    expect(imageResponse.headers()['content-type']).toContain('image/jpeg')
    const imageBytes = await imageResponse.body()
    expect(imageBytes.length).toBeLessThan(250000)
    expect(imageBytes).toEqual(await readFile('public/media/celebration-awaits.jpg'))
    const dimensions = await page.evaluate(async source => {
      const image = new Image()
      image.src = source
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const pixel = (horizontal: number, vertical: number) => Array.from(context.getImageData(horizontal, vertical, 1, 1).data)
      return { size: [image.naturalWidth, image.naturalHeight], background: pixel(600, 45), seal: pixel(600, 250) }
    }, imageUrl!)
    expect(dimensions.size).toEqual([1200, 675])
    expect(dimensions.seal).not.toEqual(dimensions.background)
    const iconPath = await page.locator('link[rel="icon"]').getAttribute('href')
    expect(iconPath).toBe('/invitation-icon.svg')
    const favicon = await request.get(iconPath!)
    expect(favicon.ok()).toBe(true)
    expect(await favicon.text()).toContain('#35121c')
    expect(await favicon.text()).not.toContain('#863bff')
    await expect(page.locator('link[rel="shortcut icon"]')).toHaveAttribute('href', '/favicon.ico')
    const fallback = await request.get('/favicon.ico', {
      headers: { 'User-Agent': 'WhatsApp/2.23.20.0', Range: 'bytes=0-30719' },
    })
    expect(fallback.ok()).toBe(true)
    const fallbackBytes = await fallback.body()
    expect(fallbackBytes).toEqual(await readFile('public/favicon.ico'))
    expect(fallbackBytes.readUInt16LE(2)).toBe(1)
    expect(fallbackBytes.readUInt16LE(4)).toBe(1)
    expect(fallbackBytes.readUInt32LE(14)).toBe(fallbackBytes.length - 22)
    expect(fallbackBytes.readUInt32LE(18)).toBe(22)
    await expect(page.locator('#root')).toBeEmpty()
  }
})

test('sharing metadata follows changing tunnel hosts without leaking between requests', async ({ page, request }) => {
  const hosts = ['preview-one.ngrok-free.app', 'preview-two.ngrok-free.app']
  const responses = await Promise.all(hosts.map(host => request.get('/sohan', { headers: { Host: host } })))
  for (const [index, response] of responses.entries()) {
    expect(response.ok()).toBe(true)
    const images = await page.evaluate(html => {
      const document = new DOMParser().parseFromString(html, 'text/html')
      return [
        document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
        document.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      ]
    }, await response.text())
    expect(images).toEqual(Array(2).fill(`https://${hosts[index]}/media/celebration-awaits.jpg`))
  }
})

async function fullyInViewport(locator: Locator) {
  await expect(locator).toBeVisible()
  await expect.poll(() => locator.evaluate(element => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.top >= -1
      && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
  }), { message: `${locator} must fit fully inside the viewport` }).toBe(true)
}

async function fullyBelowHeader(page: Page, locator: Locator) {
  await fullyInViewport(locator)
  await expect.poll(async () => {
    const header = await page.locator('.site-header').boundingBox()
    const bounds = await locator.boundingBox()
    return !!header && !!bounds && bounds.y >= header.y + header.height - 1
  }, { message: `${locator} must not be obscured by the sticky header` }).toBe(true)
}

async function focusedSectionIsAligned(page: Page, selector: string) {
  const target = page.locator(selector)
  await expect(target).toBeFocused()
  await expect(target).toBeInViewport()
  await expect.poll(() => target.evaluate(element => {
    const section = element.closest('section')
    const header = document.querySelector('.site-header')
    if (!section || !header) return false
    return Math.abs(section.getBoundingClientRect().top - header.getBoundingClientRect().bottom) <= 2
  }), { message: `${selector}'s owning section must align below the actual sticky header, without a double offset` }).toBe(true)
}

async function datesRevealKeepsPosition(page: Page, previousScroll: number, previousHeaderHeight: number) {
  await expect.poll(async () => {
    const headerHeight = await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().height)
    const currentScroll = await page.evaluate(() => scrollY)
    return currentScroll > 0
      && Math.abs(currentScroll - previousScroll) <= Math.max(previousHeaderHeight, headerHeight) + 40
  }, { message: 'Revealing dates may accommodate header reflow but must not jump to the top or away from the dates' }).toBe(true)
  await fullyBelowHeader(page, page.locator('#scratch-title'))
}

async function openingFitsViewport(page: Page) {
  await expect.poll(() => page.locator('.opening').evaluate(element => {
    const rect = element.getBoundingClientRect()
    return Math.abs(rect.left) <= 1 && Math.abs(rect.top) <= 1
      && Math.abs(rect.width - innerWidth) <= 1 && Math.abs(rect.height - innerHeight) <= 1
  }), { message: 'The full opening root must match the viewport' }).toBe(true)
  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    return Math.max(root.scrollWidth, body.scrollWidth) <= innerWidth + 1
      && Math.max(root.scrollHeight, body.scrollHeight) <= innerHeight + 1
      && Math.abs(scrollX) <= 1 && Math.abs(scrollY) <= 1
  }), { message: 'The opening document must not overflow or require scrolling' }).toBe(true)
}

async function filmFitsViewport(page: Page) {
  await openingFitsViewport(page)
  const video = page.getByLabel('Wedding opening film')
  await fullyInViewport(video)
  expect(await video.evaluate((clip: HTMLVideoElement) => clip.controls)).toBe(false)
  await expect(page.locator('.film-shade, .opening-film>.opening-grain, .opening-film>.opening-curtain')).toHaveCount(0)
  await expect(page.locator('.film-toolbar>span')).toHaveCount(0)
  await expect(page.locator('section.opening-film')).not.toContainText(/sound-free|Press play to watch|Opening preview · reduced motion/)
  await expect(video).toHaveCSS('object-fit', 'cover')
  await expect.poll(() => video.evaluate(element => {
    const rect = element.getBoundingClientRect()
    return Math.abs(rect.width - innerWidth) <= 1 && Math.abs(rect.height - innerHeight) <= 1
  }), { message: 'The film must remain edge-to-edge, not an inset player' }).toBe(true)
  const enterButton = page.getByRole('button', { name: 'Enter the celebration', exact: true })
  const musicButton = page.getByRole('button', { name: /^(Play|Pause) background music$/ })
  const toolbar = page.locator('.film-toolbar')
  for (const control of [toolbar, enterButton, musicButton]) {
    await fullyInViewport(control)
  }
  expect(await musicButton.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    return bounds.top < 100 && bounds.left > innerWidth / 2 && innerWidth - bounds.right <= 60
  })).toBe(true)
  expect(await enterButton.evaluate(element => {
    const bounds = element.getBoundingClientRect()
    return innerHeight - bounds.bottom <= 60 && bounds.height >= 44 && bounds.width < innerWidth - 60
      && Math.abs(bounds.left + bounds.width / 2 - innerWidth / 2) <= 1
  })).toBe(true)
  await expect(musicButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect.poll(async () => {
    const enter = await enterButton.boundingBox()
    const music = await musicButton.boundingBox()
    if (!enter || !music) return false
    return enter.x + enter.width <= music.x + 1 || music.x + music.width <= enter.x + 1
      || enter.y + enter.height <= music.y + 1 || music.y + music.height <= enter.y + 1
  }, { message: 'Entry and music controls must not overlap each other' }).toBe(true)
}

async function cinematicPortraitIsActive(page: Page) {
  const portrait = page.locator('.hero-art img')
  await expect(portrait).toHaveAttribute('src', '/media/cinematic-portrait.jpg')
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) =>
    image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  ), { message: 'The supplied cinematic portrait must load successfully' }).toBe(true)
  await expect(portrait).toBeVisible()
  await expect(page.locator('.hero-art .asset-label, .hero-art .art-scene')).toHaveCount(0)
  await expect(page.locator('.hero')).not.toContainText('YOUR CINEMATIC PORTRAIT HERE')
  for (const overlay of await page.locator('.hero-art .hero-emblem, .hero-art .monogram').all()) {
    await expect(overlay).not.toBeVisible()
  }
}

async function openInvitation(page: Page, path = '/aastha') {
  await page.goto(path)
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await page.getByRole('button', { name: 'Enter the celebration' }).click()
  await expect(page.locator('#home')).toBeFocused()
}

async function watchTeaser(page: Page) {
  await page.getByRole('button', { name: 'Click to unfold the celebrations', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Click to watch teaser', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('#teaser-title')).toBeFocused()
}

async function enter(page: Page, revealDates = true) {
  await openInvitation(page, '/')
  await page.getByRole('button', { name: 'Click to unfold the celebrations', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('#scratch-title')).toBeFocused()
  await expect(page.locator('#home')).toHaveCount(1)
  await expect(page.locator('#story')).toHaveCount(0)
  await expect(page.locator('#scratch-title')).toBeInViewport()
  if (revealDates) await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
}

async function celebrations(page: Page) {
  await venue(page)
  await page.getByRole('button', { name: 'Click to reveal venue', exact: true }).click()
  await page.getByRole('button', { name: 'Next: celebrations', exact: true }).click()
  await expect(page.locator('#episodes')).toBeFocused()
}

async function venue(page: Page) {
  await enter(page)
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await expect(page.locator('#venue')).toBeFocused()
}

async function playTeaser(page: Page) {
  const video = page.locator('.journey-teaser video[aria-label="Our teaser"]')
  await video.scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.readyState >= 2)).toBe(true)
  if (await page.getByRole('button', { name: 'Play teaser', exact: true }).count()) {
    await page.getByRole('button', { name: 'Play teaser', exact: true }).click()
  } else {
    await video.evaluate(async (clip: HTMLVideoElement) => { clip.currentTime = 0; await clip.play() })
  }
  await expect.poll(() => video.evaluate(clip => document.fullscreenElement === clip)).toBe(true)
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => !clip.paused && clip.currentTime > 0)).toBe(true)
  await page.evaluate(() => document.exitFullscreen())
  return video
}

for (const [path, names] of [
  ['/', ['Sohan', 'Aastha']],
  ['/aastha', ['Aastha', 'Sohan']],
  ['/sohan', ['Sohan', 'Aastha']],
] as const) {
  test(`invitation profile at ${path} survives refresh and keeps route-specific invitation and closing details`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(path)
    await page.reload()
    await expect(page.locator('main, .site-header, footer')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
    await page.getByRole('button', { name: 'Enter the celebration', exact: true }).click()
    await expect(page.locator('#hero-title')).toHaveText('The WeddingPremiere')
    await page.getByRole('button', { name: 'Click to unfold the celebrations', exact: true }).click()
    const invitation = page.getByRole('dialog')
    await expect(invitation.locator('.family-couple h3')).toHaveText([...names])
    await expect(invitation.locator('.family-ampersand')).toHaveText('and')
    await expect(invitation).not.toContainText('Both families')
    await expect(invitation.locator('.formal-invite').first()).toHaveText('We earnestly request the honour of your esteemed presence and favour of your bountiful blessings on the felicitous wedding ceremony of')
    await expect(invitation).not.toContainText(/our son|our daughter/)
    await expect(invitation).toContainText('Smt. Sutapa and Shri Srinibash Patnaik')
    await expect(invitation).toContainText('Smt. Kanchan and Late Shri Sunil Gami')
    await expect(invitation).not.toContainText(/January|2027|Bhubaneswar|Green Heaven/)
    await expect(invitation.getByRole('img')).toHaveCount(0)
    await expect(invitation.locator('.blessing')).toHaveText('|| Om Shri Shri Prajapataye Namah ||')
    expect(await invitation.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await fullyInViewport(invitation.getByRole('button', { name: 'Close dialog', exact: true }))
    const brideSide = path === '/aastha'
    const continueButton = invitation.getByRole('button', { name: brideSide ? 'Click to watch teaser' : 'Click to reveal dates', exact: true })
    await page.evaluate(() => document.fonts.ready)
    for (const viewport of [...phoneViewports, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      expect(await invitation.locator('.family-couple').evaluate(element => {
        const rows = Array.from(element.children, child => child.getBoundingClientRect())
        return rows.length === 3 && rows.every((row, index) => index === 0 || row.top >= rows[index - 1].bottom - 1)
      }), 'Couple names and "and" must occupy three separate rows').toBe(true)
      expect(await invitation.evaluate(element => element.scrollHeight <= element.clientHeight + 1), `Invitation must not scroll at ${viewport.width}x${viewport.height}`).toBe(true)
      await fullyInViewport(continueButton)
      await fullyInViewport(invitation.locator('.invitation-heading'))
      await fullyInViewport(invitation.locator('.formal-invite').first())
      await fullyInViewport(invitation.locator('.family-couple'))
      expect(await invitation.locator('.family-person p').evaluateAll(elements => elements.every(element => {
        const text = element.textContent
        const textNode = element.firstChild
        if (!text || !textNode) return false
        const surnameStart = text.lastIndexOf(' ') + 1
        const nameStart = text.lastIndexOf(' ', surnameStart - 2) + 1
        const name = document.createRange()
        name.setStart(textNode, nameStart)
        name.setEnd(textNode, surnameStart - 1)
        const surname = document.createRange()
        surname.setStart(textNode, surnameStart)
        surname.setEnd(textNode, text.length)
        return Math.abs(name.getBoundingClientRect().top - surname.getBoundingClientRect().top) <= 1
      })), 'Patnaik and Gami must stay with the preceding name').toBe(true)
      await fullyInViewport(invitation.locator('.invitation-closing'))
    }
    await continueButton.focus()
    await page.keyboard.press('Enter')
    await expect(invitation).toHaveCount(0)
    await expect(page.locator(brideSide ? '#teaser-title' : '#scratch-title')).toBeFocused()
    expect(new URL(page.url()).pathname).toBe(path)
    if (brideSide) {
      await expect(page.locator('.journey-teaser video')).toHaveAttribute('src', '/media/teaser-portrait.mp4')
      await page.getByRole('button', { name: 'Continue without video', exact: true }).click()
    } else {
      await expect(page.locator('#story, .journey-teaser video')).toHaveCount(0)
      await expect(page.locator('.invitation-preview')).toHaveCount(0)
      await fullyBelowHeader(page, page.locator('#scratch-title'))
    }
    for (const name of ['Click to reveal dates', 'Next: the venue', 'Click to reveal venue', 'Next: celebrations', 'Next: warm regards']) {
      await page.getByRole('button', { name, exact: true }).click()
    }
    const closing = page.locator('#warm-regards')
    await expect(closing.locator('address a')).toHaveCount(brideSide ? 2 : 3)
    if (brideSide) {
      await expect(closing.getByRole('link', { name: 'Ayush Gami | +91-8340299405', exact: true })).toHaveAttribute('href', 'tel:+918340299405')
      await expect(closing.getByRole('link', { name: 'Abhishek Gami | +91-9903841151', exact: true })).toHaveAttribute('href', 'tel:+919903841151')
      await expect(closing.locator('.regards-family')).toHaveText('With Best Compliments fromKanchan, Ayush, Archana, Abhishek, Miransh')
      await expect(closing).not.toContainText(/Patnaik|Pattnaik|Srinibash|Sutapa|Subhasis/)
    } else {
      await expect(closing).toContainText('The Patnaik Family')
      await expect(closing).toContainText('Srinibash, Sutapa, Suhani and Subhasis')
      await expect(closing).not.toContainText(/Ayush Gami|Abhishek Gami|Miransh/)
    }
    if (brideSide) {
      for (const viewport of [...phoneViewports, { width: 1440, height: 900 }]) {
        await page.setViewportSize(viewport)
        await closing.scrollIntoViewIfNeeded()
        await fullyBelowHeader(page, closing.locator('.regards-contacts'))
        await fullyBelowHeader(page, closing.locator('.regards-family'))
      }
    }
  })
}

test('entrance and parents invitation keep dates and destination under wraps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('main, .site-header, footer')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(/January|2027|Bhubaneswar|Green Heaven|Mehendi|Sangeet/)
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.locator('.opening')).not.toContainText(/January|2027|Bhubaneswar|Green Heaven/)
  await page.getByRole('button', { name: 'Enter the celebration' }).click()
  await expect(page.locator('.hero')).not.toContainText(/January|2027|Bhubaneswar|Green Heaven|Mehendi|Sangeet/)
  await expect(page.locator('.countdown, .episode-card, #venue, #wardrobe')).toHaveCount(0)
  await page.getByRole('button', { name: 'Click to unfold the celebrations' }).click()
  const invitation = page.getByRole('dialog')
  await expect(invitation).not.toContainText('A CELEBRATION OF LOVE AND TRADITION')
  await expect(invitation.getByRole('img')).toHaveCount(0)
  await expect(invitation).not.toContainText('Both families')
  await expect(invitation).not.toContainText(/Sujata|Laxmi Narayan|their nephew/)
  await expect(invitation).toContainText('Smt. Sutapa and Shri Srinibash Patnaik')
  await expect(invitation).toContainText('Smt. Kanchan and Late Shri Sunil Gami')
  await expect(invitation).toContainText('earnestly request the honour of your esteemed presence and favour of your bountiful blessings on the felicitous wedding ceremony of')
  await expect(invitation).toContainText('Om Shri Shri Prajapataye Namah')
  await expect(invitation).toContainText('May Lord Jagannath bless')
  await expect(invitation).not.toContainText(/we request|our wedding|January|2027|Bhubaneswar|Green Heaven/)
  await expect(invitation.locator('.family-couple')).toContainText('Sohan')
  await expect(invitation.locator('.family-couple')).toContainText('Aastha')
  await expect(invitation.getByRole('button', { name: 'Click to reveal dates' })).toBeVisible()
  await invitation.evaluate(element => { element.scrollTop = element.scrollHeight })
  await expect(page.getByRole('button', { name: 'Close dialog' })).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Pause background music' })).toBeInViewport()
})

test('venue reveal unlocks forward scrolling; earlier sections remain accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enter(page, false)
  await expect(page.getByRole('button', { name: 'Next: celebrations', exact: true })).toHaveCount(0)
  await expect(page.locator('.episode-card, .countdown, #wardrobe, #venue')).toHaveCount(0)
  await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('.countdown')).toBeVisible()
  await expect(page.locator('.episode-card, #episodes, #guest-guide, .finale')).toHaveCount(0)
  await expect(page.locator('#venue')).toHaveCount(1)
  await expect(page.locator('#wardrobe, .wardrobe-tabs, #outfit-panel')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Next: celebrations', exact: true })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(/Green Heaven|Bhubaneswar/)
  await expect(page.locator('#venue iframe')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await focusedSectionIsAligned(page, '#venue')
  const venueScroll = await page.evaluate(() => scrollY)
  await page.mouse.wheel(0, 2000)
  await page.keyboard.press('End')
  await expect.poll(() => page.evaluate(previous => Math.abs(scrollY - previous) <= 2, venueScroll)).toBe(true)
  await expect(page.locator('#episodes, #guest-guide, .finale')).toHaveCount(0)
  await page.mouse.wheel(0, -500)
  await expect.poll(() => page.evaluate(previous => scrollY < previous - 100, venueScroll)).toBe(true)
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await focusedSectionIsAligned(page, '#venue')
  await page.getByRole('button', { name: 'Click to reveal venue' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('link', { name: 'Get directions', exact: true })).toBeFocused()
  await expect(page.locator('#episodes, #guest-guide, .finale')).toHaveCount(2)
  await expect(page.locator('.episode-card')).toHaveCount(4)
  await page.mouse.wheel(0, 500)
  await expect.poll(() => page.evaluate(previous => scrollY > previous + 100, venueScroll)).toBe(true)
  await expect(page.locator('#venue')).toContainText('Green Heaven Resort')
  await expect(page.locator('#venue')).toContainText('Bhubaneswar, Odisha')
  await page.getByRole('button', { name: 'aastheticsohlmates home', exact: true }).click()
  await page.getByRole('button', { name: 'Click to unfold the celebrations' }).click()
  await expect(page.getByRole('dialog')).not.toContainText(/January|2027/)
  await expect(page.getByRole('dialog')).toContainText('The Green Heaven Resort, Raghunathpur, Bhubaneswar, Odisha')
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Click to reveal dates', exact: true })).toBeVisible()
})

test('inline teaser restores previously playing music on pause, end, scrolling away and section navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openInvitation(page)
  const audio = page.locator('audio.background-music')
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => !track.paused)).toBe(true)
  await watchTeaser(page)
  const video = await playTeaser(page)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  const position = await audio.evaluate((track: HTMLAudioElement) => track.currentTime)
  await video.evaluate((clip: HTMLVideoElement) => clip.pause())
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => !track.paused)).toBe(true)
  expect(await audio.evaluate((track: HTMLAudioElement) => track.currentTime)).toBeGreaterThanOrEqual(position)
  await playTeaser(page)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  await video.evaluate((clip: HTMLVideoElement) => { clip.currentTime = clip.duration - .2 })
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.ended)).toBe(true)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => !track.paused)).toBe(true)
  await playTeaser(page)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  await page.locator('#home').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }))
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.paused)).toBe(true)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => !track.paused)).toBe(true)
  await playTeaser(page)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  await page.getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('#scratch-title')).toBeFocused()
  await expect(video).toHaveCount(1)
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.paused)).toBe(true)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => !track.paused)).toBe(true)
})

test('teaser respects music off and manual audio switching prevents overlap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openInvitation(page)
  await page.getByRole('button', { name: 'Pause background music' }).click()
  const audio = page.locator('audio.background-music')
  await watchTeaser(page)
  const video = await playTeaser(page)
  expect(await audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  await video.evaluate((clip: HTMLVideoElement) => clip.pause())
  expect(await audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  await playTeaser(page)
  await page.getByRole('button', { name: 'Play background music' }).click()
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.paused)).toBe(true)
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => !track.paused)).toBe(true)
  await page.getByRole('button', { name: 'Pause background music' }).click()
  await playTeaser(page)
  await video.evaluate((clip: HTMLVideoElement) => { clip.currentTime = clip.duration - .2 })
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.ended)).toBe(true)
  expect(await audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  await playTeaser(page)
  await page.getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('#scratch-title')).toBeFocused()
  expect(await audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
})

test('music starts only on click and persists through entry, navigation and dialogs', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/aastha')
  const audio = page.locator('audio.background-music')
  await expect(audio).toHaveAttribute('src', '/media/kudmayi-instrumental.mp3')
  expect(await audio.evaluate((track: HTMLAudioElement) => track.paused && track.currentTime === 0)).toBe(true)
  await expect(page.getByRole('button', { name: /background music/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause background music' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => track.currentTime > 0)).toBe(true)
  await audio.evaluate((track: HTMLAudioElement) => { track.dataset.identity = 'same-track'; track.currentTime = 15 })
  await page.getByRole('button', { name: 'Enter the celebration' }).click()
  expect(await audio.evaluate((track: HTMLAudioElement) => track.dataset.identity === 'same-track' && !track.paused && track.currentTime >= 15 && track.loop)).toBe(true)
  await watchTeaser(page)
  await page.getByRole('button', { name: 'Pause background music' }).click()
  expect(await audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
  await page.getByRole('button', { name: 'Play background music' }).focus()
  await page.keyboard.press('Enter')
  await expect.poll(() => audio.evaluate((track: HTMLAudioElement) => !track.paused && track.currentTime >= 15)).toBe(true)
  await page.getByRole('button', { name: 'Continue without video', exact: true }).click()
  await page.getByRole('button', { name: 'Pause background music' }).click()
  await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await page.getByRole('button', { name: 'Click to reveal venue', exact: true }).click()
  await page.getByRole('button', { name: 'Next: celebrations', exact: true }).click()
  await page.getByRole('button', { name: '31 January', exact: true }).click()
  await page.getByRole('button', { name: 'Explore Ajab Haldi Ki Gazab Kahani' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await audio.evaluate((track: HTMLAudioElement) => track.dataset.identity === 'same-track' && track.currentTime >= 15 && track.loop)).toBe(true)
  expect(await audio.evaluate((track: HTMLAudioElement) => track.paused)).toBe(true)
})

test('unavailable music does not prevent entry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/media/kudmayi-instrumental.mp3', route => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.locator('.music-control').getByRole('status')).toHaveText('Music unavailable. Press play to retry.')
  await page.getByRole('button', { name: 'Enter the celebration' }).click()
  await expect(page.locator('#hero-title')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play background music' })).toBeVisible()
})

test('guest must click to open; film stays edge-to-edge; page is burgundy and beige', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/aastha')
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /A celebration awaits/ })).toBeVisible()
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.getByLabel('Wedding opening film')).toBeVisible()
  await filmFitsViewport(page)
  await expect(page.getByRole('button', { name: 'Enter the celebration' })).toBeFocused()
  await page.getByRole('button', { name: 'Enter the celebration' }).click()
  await expect(page.locator('#hero-title')).toBeVisible()
  await expect(page.locator('#home')).toBeFocused()
  await cinematicPortraitIsActive(page)
  await expect.poll(() => page.locator('.hero-art').evaluate(element => {
    const artwork = element.getBoundingClientRect()
    const hero = element.closest('.hero')!.getBoundingClientRect()
    return Math.abs(artwork.left - hero.left) <= 1 && Math.abs(artwork.width - hero.width) <= 1
  }), { message: 'The cinematic portrait must span the entire hero width' }).toBe(true)
  expect(await page.locator('body').evaluate(element => getComputedStyle(element).color)).toBe('rgb(66, 30, 38)')
  expect(await page.locator('.hero').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(49, 16, 27)')
  await expect(page.locator('footer')).toHaveCount(0)
  await watchTeaser(page)
  await expect(page.locator('footer')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('opening preserves video size and first frames without loading a curtain renderer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    const snapshots: Record<string, { width: number; height: number; time: number }> = {}
    new MutationObserver(() => {
      const opening = document.querySelector('.opening')
      const clip = opening?.querySelector<HTMLVideoElement>('video')
      if (!opening || !clip) return
      const phase = opening.classList.contains('opening-unsealing') ? 'hidden' : opening.classList.contains('opening-film') ? 'visible' : ''
      if (!phase || snapshots[phase]) return
      const bounds = clip.getBoundingClientRect()
      snapshots[phase] = { width: bounds.width, height: bounds.height, time: clip.currentTime }
      document.documentElement.dataset.videoHandoff = JSON.stringify(snapshots)
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
  })
  const rendererRequests: string[] = []
  page.on('request', request => { if (/three[./]|theatrecurtains/i.test(request.url())) rendererRequests.push(request.url()) })
  await page.goto('/')
  await expect(page.locator('video, main')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.getByLabel('Wedding opening film')).toBeVisible()
  const handoff = await page.evaluate(() => JSON.parse(document.documentElement.dataset.videoHandoff!))
  expect(handoff.hidden.width).toBe(page.viewportSize()!.width)
  expect(handoff.hidden.height).toBe(page.viewportSize()!.height)
  expect(handoff.visible.width).toBe(handoff.hidden.width)
  expect(handoff.visible.height).toBe(handoff.hidden.height)
  expect(handoff.visible.time).toBeLessThan(.15)
  await expect(page.locator('.opening.opening-film>.opening-film')).toHaveCSS('animation-name', 'opening-film-arrive')
  await expect(page.locator('.opening canvas, .opening-curtain, .theatre-curtains, main')).toHaveCount(0)
  await expect(page.locator('#opening-title')).toHaveCount(1)
  expect(rendererRequests).toEqual([])
})

test('opening reveals an already playing film without a frozen poster or native controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  const video = page.getByLabel('Wedding opening film')
  await expect(video).toBeVisible()
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => !clip.paused && clip.currentTime > 0 && clip.readyState >= 2)).toBe(true)
  await expect(page.locator('main')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Enter the celebration', exact: true })).toBeEnabled()
  await expect(page.locator('.theatre-curtains, .opening-curtain, .theatre-canvas')).toHaveCount(0)
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.currentTime > 0 && !clip.paused)).toBe(true)
  expect(await video.evaluate((clip: HTMLVideoElement) => !clip.autoplay && clip.muted && clip.playsInline && !clip.controls)).toBe(true)
  await expect(page.locator('.film-shade, .opening-film>.opening-grain, .opening-film>.opening-curtain')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^(Play|Pause) background music$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enter the celebration', exact: true })).toBeVisible()
})

test('slow film loading does not delay entry or add a curtain', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let release = () => {}
  const available = new Promise<void>(resolve => { release = resolve })
  await page.route('**/opening-*.mp4', async route => { await available; await route.continue() })
  try {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
    await expect(page.getByLabel('Wedding opening film')).toBeVisible()
    await expect(page.locator('.theatre-curtains')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enter the celebration', exact: true })).toBeEnabled()
    release()
    await expect.poll(() => page.getByLabel('Wedding opening film').evaluate((clip: HTMLVideoElement) => !clip.paused && clip.currentTime > 0)).toBe(true)
    await page.getByRole('button', { name: 'Enter the celebration', exact: true }).click()
    await expect(page.locator('#home')).toBeFocused()
  } finally { release() }
})

test('blocked opening playback offers a fitting retry and never traps guests', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function () {
      if (this.getAttribute('aria-label') === 'Wedding opening film') return Promise.reject(new DOMException('Playback blocked for test', 'NotAllowedError'))
      return play.call(this)
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  const retry = page.getByRole('button', { name: 'Play opening film', exact: true })
  const entry = page.getByRole('button', { name: 'Enter the celebration', exact: true })
  await fullyInViewport(retry)
  await fullyInViewport(entry)
  expect(await retry.evaluate(element => element.getBoundingClientRect().bottom <= document.querySelector('.film-toolbar .primary')!.getBoundingClientRect().top)).toBe(true)
  await retry.click()
  await expect(page.getByLabel('Animated opening preview; opening video unavailable')).toBeVisible()
  await entry.click()
  await expect(page.locator('#home')).toBeFocused()
})

test('reduced motion during the opening pauses the film', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.getByLabel('Wedding opening film')).toBeVisible()
  await expect.poll(() => page.getByLabel('Wedding opening film').evaluate((clip: HTMLVideoElement) => !clip.paused && clip.currentTime > 0)).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.theatre-curtains')).toHaveCount(0)
  await expect.poll(() => page.getByLabel('Wedding opening film').evaluate((clip: HTMLVideoElement) => clip.paused)).toBe(true)
  await page.getByRole('button', { name: 'Enter the celebration', exact: true }).click()
  await expect(page.locator('#home')).toBeFocused()
})

test('cancelling the entrance exit cannot trap a guest behind the opening', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Enter the celebration', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enter the celebration', exact: true }).click()
  await page.locator('.opening-entering').evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => animation.cancel()))
  await expect(page.locator('#home')).toBeFocused()
  await expect(page.locator('.opening')).toHaveCount(0)
})

test('royal scroll unfurls and rolls back on Escape with restored focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openInvitation(page)
  const trigger = page.getByRole('button', { name: 'Click to unfold the celebrations', exact: true })
  await trigger.click()
  const scroll = page.locator('.royal-scroll')
  await expect(scroll).toHaveCSS('animation-name', 'royal-unfurl')
  await expect.poll(() => scroll.evaluate(element => element.getAnimations().every(animation => animation.playState === 'finished'))).toBe(true)
  await page.setViewportSize({ width: 1280, height: 720 })
  await expect.poll(() => page.getByRole('dialog').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true)
  await fullyInViewport(scroll.getByRole('button', { name: 'Click to watch teaser', exact: true }))
  await expect(scroll.locator('.blessing')).toHaveCSS('color', 'rgb(128, 85, 39)')
  await page.keyboard.press('Escape')
  await expect(scroll).toHaveCSS('animation-name', 'royal-roll-up')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('programmes share their poster motifs and remain static with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await celebrations(page)
  for (const [name, theme] of [['Band Baaja Mehendi', 'mehendi'], ['Jhoom Barabar Jhoom', 'sangeet'], ['Ajab Haldi Ki Gazab Kahani', 'haldi'], ['Two Souls, One Love', 'shaadi']]) {
    const card = page.getByRole('button', { name: `Explore ${name}`, exact: true })
    await expect(card.locator(`.motif-${theme}`)).toHaveAttribute('aria-hidden', 'true')
    await expect(card.locator(`.motif-${theme}`)).toHaveCSS('pointer-events', 'none')
    await card.click()
    await expect(page.locator('.event-programme')).toHaveClass(new RegExp(`programme-${theme}`))
    await expect(page.locator('.event-programme')).toHaveCSS('animation-name', 'none')
    await expect(page.locator('.event-programme .motif-light')).toHaveCSS('animation-name', 'none')
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  }
})

test('opening selects landscape and portrait sources and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(0)
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  const video = page.getByLabel('Wedding opening film')
  // Keep the film mounted while rotating both ways, including short landscape screens.
  for (const viewport of [{ width: 1280, height: 720 }, ...phoneViewports, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const portrait = viewport.height > viewport.width
    await expect(video).toHaveAttribute('src', `/media/opening-${portrait ? 'portrait' : 'landscape'}.mp4`)
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState >= 2)).toBe(true)
    expect(await video.evaluate((element: HTMLVideoElement) => element.paused && element.muted && element.playsInline)).toBe(true)
    expect(await video.evaluate((element: HTMLVideoElement) => element.videoHeight > element.videoWidth)).toBe(portrait)
    await filmFitsViewport(page)
    await expect(page.locator('main, .site-header, footer')).toHaveCount(0)
    await expect(page.locator('.opening')).not.toContainText(/January|2027|Bhubaneswar|Green Heaven|Mehendi|Sangeet/)
  }
  await video.evaluate((element: HTMLVideoElement) => element.play())
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime > 0 && !element.paused)).toBe(true)
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - .2 })
  await expect(page.locator('#hero-title')).toBeVisible()
})

test('monogram gently glows without movement and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const seal = page.locator('.seal-opener .wax-seal')
  const monogram = seal.locator('img')
  await expect(seal).toHaveCSS('animation-name', 'seal-glow')
  await expect(seal).toHaveCSS('animation-duration', '4s')
  await expect(seal).toHaveCSS('animation-iteration-count', 'infinite')
  await expect(monogram).toHaveCSS('animation-name', 'monogram-glow')
  const phases = await seal.evaluate(element => {
    const image = element.querySelector('img')!
    const animations = [...element.getAnimations(), ...image.getAnimations()]
    return [0, 2000].map(time => {
      for (const animation of animations) { animation.pause(); animation.currentTime = time }
      const bounds = element.getBoundingClientRect()
      return { shadow: getComputedStyle(element).boxShadow, filter: getComputedStyle(image).filter, width: bounds.width, height: bounds.height }
    })
  })
  expect(phases[0].shadow).not.toBe(phases[1].shadow)
  expect(phases[0].filter).not.toBe(phases[1].filter)
  expect(phases[0].width).toBe(phases[1].width)
  expect(phases[0].height).toBe(phases[1].height)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(seal).toHaveCSS('animation-name', 'none')
  await expect(monogram).toHaveCSS('animation-name', 'none')
})

for (const viewport of phoneViewports) {
  test(`sealed opening, film and cinematic hero fit ${viewport.width}x${viewport.height} without spoilers`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(viewport)
    await page.goto('/aastha')
    await openingFitsViewport(page)
    const ganesh = page.getByRole('img', { name: 'Lord Ganesh', exact: true })
    await fullyInViewport(ganesh)
    await expect.poll(() => ganesh.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    await expect(page.locator('.opening')).not.toContainText(/A little anticipation|Opens with music|OPEN THE SEAL\. LET THE REST UNFOLD\./)
    await expect(page.locator('.opening-topline')).not.toContainText('A PERSONAL INVITATION')
    await expect(page.locator('.opening-topline>span')).toHaveCount(1)
    await expect.poll(() => page.locator('.opening-sealed').evaluate(element => {
      const frame = element.getBoundingClientRect()
      const inset = parseFloat(getComputedStyle(element, '::after').top)
      const labels = [...element.querySelectorAll('.opening-topline>span')].map(label => label.getBoundingClientRect())
      return labels.every(label => label.left >= frame.left + inset + 8 && label.right <= frame.right - inset - 8 && label.top >= frame.top + inset + 8)
      }), { message: 'The cover label must sit inside and clear of the decorative frame' }).toBe(true)
    await fullyInViewport(page.getByRole('heading', { name: /A celebration awaits/ }))
    await expect(page.locator('.opening-invite')).toContainText('FOR YOU & YOUR LOVED ONES')
    await expect(page.locator('.opening-dedication')).toHaveText('A moment to gather,an occasion to cherish.')
    await expect(page.locator('.opening-invite')).not.toContainText(/Sohan|Aastha|SOMETHING SPECIAL IS SEALED INSIDE|Just for you/)
    const seal = page.getByRole('button', { name: 'Open the invitation', exact: true })
    await fullyInViewport(seal)
    await expect(seal).toContainText('CLICK THE SEAL TO OPEN')
    await expect(seal).not.toContainText('Open Invitation')
    const monogram = seal.getByRole('img', { name: 'Wedding monogram', exact: true })
    await expect.poll(() => monogram.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    await fullyInViewport(seal.locator('.seal-instruction'))
    await seal.focus()
    await expect(seal).toBeFocused()
    await expect(seal).toHaveCSS('outline-style', 'solid')
    await fullyInViewport(page.locator('.opening-invite'))
    const coverBrand = await page.locator('.opening-topline>span').boundingBox()
    await expect(page.locator('main, .site-header, footer')).toHaveCount(0)
    await expect(page.locator('body')).not.toContainText(/January|2027|Bhubaneswar|Green Heaven|Mehendi|Sangeet/)
    await seal.click()
    await filmFitsViewport(page)
    await expect.poll(async () => {
      const filmBrand = await page.locator('.opening-topline>span').boundingBox()
      return !!coverBrand && !!filmBrand && ['x', 'y', 'width', 'height'].every(key =>
        Math.abs(filmBrand[key as keyof typeof filmBrand] - coverBrand[key as keyof typeof coverBrand]) <= 1)
    }, { message: 'The original label must retain its exact cover position and dimensions during the film' }).toBe(true)
    await expect(page.locator('main, .site-header, footer')).toHaveCount(0)
    await expect(page.locator('.opening')).not.toContainText(/January|2027|Bhubaneswar|Green Heaven|Mehendi|Sangeet/)
    await page.getByRole('button', { name: 'Enter the celebration', exact: true }).click()
    await expect(page.locator('#home')).toBeFocused()
    await expect(page.locator('.opening')).toHaveCount(0)
    expect(await page.locator('.site-header').evaluate(header => {
      const bounds = header.getBoundingClientRect()
      const brand = header.querySelector('.brand')!.getBoundingClientRect()
      const music = header.querySelector('.music-control')!.getBoundingClientRect()
      return bounds.height <= 72
        && Math.abs(brand.top - bounds.top - (bounds.bottom - brand.bottom)) <= 2
        && Math.abs(music.top - bounds.top - (bounds.bottom - music.bottom)) <= 2
    })).toBe(true)
    await cinematicPortraitIsActive(page)
    if (viewport.height > viewport.width) {
      await expect(page.locator('.hero-art img')).toHaveCSS('object-position', '76% 100%')
      // Both heads occupy source x=57.2%–77.4%. Protect them from a
      // centred cover crop that would cut the bride out on narrow phones.
      expect(await page.locator('.hero-art img').evaluate((image: HTMLImageElement) => {
        const width = image.clientWidth, height = image.clientHeight
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
        const displayedWidth = image.naturalWidth * scale
        const offset = (width - displayedWidth) * .76
        return offset + displayedWidth * .572 >= 0 && offset + displayedWidth * .774 <= width
      })).toBe(true)
    }
    await expect(page.locator('#hero-title, .hero-tagline, .hero-description, .hero-buttons')).toHaveCount(4)
    await expect(page.getByRole('list', { name: 'Celebration details' })).toHaveCount(0)
    await expect(page.locator('.hero')).not.toContainText(/2 days|4 celebrations/)
    expect(await page.locator('.hero-content').evaluate(content => {
      const elements = [...content.children].map(element => element.getBoundingClientRect())
      return elements.every((bounds, index) => index === 0 || bounds.top >= elements[index - 1].bottom)
        && elements.every(bounds => Math.abs(bounds.left - elements[0].left) <= 1)
    })).toBe(true)
    await expect(page.locator('#hero-title')).toHaveText('The WeddingPremiere')
    await expect(page.locator('.hero-tagline')).toHaveText('Two families. So many reasons to celebrate.')
    await expect(page.locator('.hero-description')).toHaveText('A wedding marks the beginning of a new chapter. And with it comes the joy of bringing families and friends together for a celebration to be remembered.')
    await expect(page.locator('.hero')).not.toContainText(/THE FAMILY INVITATION|First, a welcome|BEGIN WITH THE FAMILY INVITATION/)
    if (viewport.height > viewport.width) {
      for (const selector of ['#hero-title', '.hero-tagline', '.hero-description', '.hero-buttons']) {
        await fullyInViewport(page.locator(selector))
      }
    }
    // The phone composition fits the viewport; later sections scroll normally.
    await expect(page.locator('.hero-art')).toHaveCSS('position', 'absolute')
    await expect.poll(() => page.locator('.hero-art').evaluate(element => {
      const image = element.getBoundingClientRect()
      const hero = element.closest('.hero')!.getBoundingClientRect()
      return Math.abs(image.height - hero.height) <= 1
    })).toBe(true)
    await expect(page.locator('body')).not.toContainText(/January|2027|Bhubaneswar|Green Heaven|Mehendi|Sangeet/)
    await expect(page.locator('#story, .scratch-section, .countdown, .episode-card, #wardrobe, #venue')).toHaveCount(0)
    // Only the entrance is viewport-bound: revealed sections must still scroll normally.
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(page.locator('.invitation-prompt')).toHaveCount(0)
    for (const selector of ['#hero-title', '.hero-tagline', '.hero-description', '.hero-buttons']) {
      await fullyBelowHeader(page, page.locator(selector))
    }
    await page.mouse.wheel(0, 800)
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true)
    await watchTeaser(page)
    await expect(page.locator('.invitation-preview')).toHaveCount(0)
    await expect(page.locator('footer')).toHaveCount(0)
    await expect(page.locator('#home, #story')).toHaveCount(2)
    await expect(page.locator('#teaser-title')).toBeInViewport()
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'aastheticsohlmates home', exact: true }).click()
    await expect(page.locator('#home')).toBeFocused()
    await expect(page.locator('#hero-title')).toBeInViewport()
    await expect(page.locator('#story')).toHaveCount(1)
    await expect(page.locator('.countdown, .episode-card, #wardrobe, #venue')).toHaveCount(0)
  })
}

test('failed opening video offers labelled preview and an exit', async ({ page }) => {
  await page.route('**/media/opening-*.mp4', route => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Open the invitation', exact: true }).click()
  await expect(page.getByText('ANIMATED PREVIEW · OPENING VIDEO UNAVAILABLE')).toBeVisible()
  await expect(page.getByRole('navigation')).toHaveCount(0)
  await page.getByRole('button', { name: 'Enter the celebration' }).click()
  await expect(page.locator('#hero-title')).toBeVisible()
})

test('maroon dates page fits before and after revealing on phones and desktop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [...phoneViewports, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await enter(page, false)
    const section = page.locator('#dates')
    await expect(page.locator('#scratch-title')).toHaveText('Save the Dates.')
    await expect(page.locator('.scratch-copy .eyebrow')).toHaveText('THE COUNTDOWN BEGINS')
    await expect(page.locator('.scratch-copy > p:not(.eyebrow)')).toHaveText('The festivities are planned, the excitement is looming, and the dates are yours to discover.')
    await focusedSectionIsAligned(page, '#scratch-title')
    await expect(section).toHaveCSS('color', 'rgb(247, 236, 223)')
    await expect(page.locator('#scratch-title')).toHaveCSS('outline-style', 'none')
    await expect.poll(() => section.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return bounds.left <= 1 && bounds.right >= document.documentElement.clientWidth - 1
    })).toBe(true)
    await fullyBelowHeader(page, page.locator('.scratch-card'))
    await fullyBelowHeader(page, section.getByRole('button', { name: 'Click to reveal dates', exact: true }))
    await page.evaluate(() => document.fonts.ready)
    const positions = await section.locator('.scratch-copy, .scratch-card, .scratch-controls, .section-next').evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect()
      return { top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }
    }))
    await expect(page.locator('footer, .footer-hashtag')).toHaveCount(0)
    await expect(page.locator('.scratch-copy')).toHaveCSS('text-align', 'center')
    await section.getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
    await fullyBelowHeader(page, page.locator('.scratch-card'))
    await expect(section.getByRole('status')).toContainText('30–31 January 2027')
    await fullyBelowHeader(page, page.getByRole('button', { name: 'Save the dates', exact: true }))
    await fullyBelowHeader(page, page.getByRole('button', { name: 'Next: the venue', exact: true }))
    await expect.poll(() => page.locator('.scratch-date .countdown').evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const panel = element.closest('.scratch-card')!.getBoundingClientRect()
      return Math.abs(bounds.left + bounds.width / 2 - panel.left - panel.width / 2) <= 2
    })).toBe(true)
    await expect.poll(() => section.locator('.scratch-copy, .scratch-card, .scratch-controls, .section-next').evaluateAll((elements, previous) => elements.every((element, index) => {
      const bounds = element.getBoundingClientRect()
      const before = previous[index]
      return Math.abs(bounds.top - before.top) <= 2 && Math.abs(bounds.left - before.left) <= 2
        && Math.abs(bounds.width - before.width) <= 2 && Math.abs(bounds.height - before.height) <= 2
    }), positions), { message: 'Date reveal must not move or resize its content' }).toBe(true)
    await expect(page.locator('footer, .footer-hashtag')).toHaveCount(0)
  }
})

test('keyboard reveal and calendar download', async ({ page }) => {
  await enter(page, false)
  await expect(page.locator('.scratch-date')).toHaveAttribute('aria-hidden', 'true')
  await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.scratch-section').getByRole('status')).toContainText('30–31 January 2027')
  await expect(page.locator('.scratch-date')).toHaveAttribute('aria-hidden', 'false')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save the dates', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('sohan-aastha-save-the-dates.ics')
  const path = await download.path()
  const data = await readFile(path!, 'utf8')
  expect(data).toContain('DTSTART;VALUE=DATE:20270130')
  expect(data).toContain('Mehendi 9:00 a.m. onwards')
  expect(data).toContain('Haldi and Carnival 9:00 a.m. onwards')
  expect(data).not.toMatch(/8:00 a\.m\.|6:30 a\.m\.|10:00 a\.m\./)
  expect(data).toContain('Pheras 11:00 p.m. onwards')
  expect(data).not.toContain('timings to be confirmed')
  expect(data).toContain('DTEND;VALUE=DATE:20270201')
})

test('actual pointer scratching clears foil and reveals the dates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enter(page, false)
  const foil = page.locator('canvas.foil')
  await foil.scrollIntoViewIfNeeded()
  const box = (await foil.boundingBox())!
  await page.mouse.move(box.x + 10, box.y + box.height * .15)
  await page.mouse.down()
  for (let row = 0; row < 12; row++) {
    const y = box.y + box.height * (.05 + row * .08)
    await page.mouse.move(box.x + 10, y, { steps: 2 })
    await page.mouse.move(box.x + box.width - 10, y, { steps: 12 })
  }
  await page.mouse.up()
  await expect(page.locator('.scratch-section').getByRole('status')).toContainText('It’s a date!')
  await expect(foil).toHaveClass(/revealed/)
})

test('invitation motion is finite and respects reduced motion', async ({ page }) => {
  for (const motion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion: motion })
    await enter(page, false)
    const unfold = page.getByRole('button', { name: 'Click to unfold the celebrations', exact: true })
    await expect(unfold).toHaveCSS('border-top-style', 'solid')
    await expect(unfold).toHaveCSS('animation-name', motion === 'reduce' ? 'none' : 'next-action-highlight')
    if (motion === 'no-preference') await expect(unfold).toHaveCSS('animation-iteration-count', '2')
    await expect(page.getByRole('button', { name: 'Click to reveal dates', exact: true })).toHaveCSS('border-top-style', 'solid')
    const petals = page.locator('#dates .celebration-ornaments i')
    await expect(petals).toHaveCount(18)
    await expect(page.locator('#dates .shower-flower')).toHaveCount(3)
    await expect(page.locator('#dates .royal-garland')).toHaveCount(1)
    await expect.poll(() => page.locator('#dates .royal-garland img, #dates .shower-flower img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true)
    await expect(page.locator('#dates .celebration-ornaments svg')).toHaveCount(0)
    expect(await page.locator('#dates .royal-garland').evaluate(element => {
      if (getComputedStyle(element).display === 'none') return true
      const copy = document.querySelector('#dates .scratch-copy')!
      return element.getBoundingClientRect().bottom <= copy.getBoundingClientRect().top
    }), 'Botanical artwork must stay above the dates copy').toBe(true)
    await expect(page.locator('.royal-flourish, .royal-arch')).toHaveCount(0)
    await expect(page.locator('#dates .celebration-ornaments')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('#dates .celebration-ornaments')).toHaveCSS('pointer-events', 'none')
    if (motion === 'no-preference') {
      await expect(page.locator('#dates')).toHaveClass(/in-view/)
      await expect(petals.first()).toHaveCSS('animation-name', 'celebration-petals')
      await expect(page.locator('#hero-title')).toHaveCSS('animation-name', 'invitation-ink')
      expect(await petals.evaluateAll(elements => elements.every(element => {
        const animation = element.getAnimations()[0]
        const timing = animation?.effect?.getComputedTiming()
        return !!timing && timing.iterations === 1 && Number.isFinite(timing.endTime) && timing.endTime <= 8500
      }))).toBe(true)
      const visiblePetals = await page.locator('#dates .celebration-ornaments').evaluate(element => {
        const particles = Array.from(element.querySelectorAll('i'))
        particles.forEach(particle => particle.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 2100 }))
        const bounds = element.getBoundingClientRect()
        return particles.filter(particle => {
          const rect = particle.getBoundingClientRect()
          return Number(getComputedStyle(particle).opacity) > .15 && rect.bottom > bounds.top && rect.top < bounds.bottom && rect.right > bounds.left && rect.left < bounds.right
        }).length
      })
      expect(visiblePetals).toBeGreaterThan(3)
      expect(await petals.evaluateAll(elements => {
        const styles = elements.map(element => getComputedStyle(element))
        return styles.every(style => parseFloat(style.width) < 15) && new Set(styles.map(style => style.animationDelay)).size === elements.length && new Set(styles.map(style => style.animationDuration)).size === elements.length && new Set(styles.map(style => style.left)).size === elements.length
      })).toBe(true)
    } else {
      await expect(petals.first()).toHaveCSS('animation-name', 'none')
      await expect(page.locator('#hero-title')).toHaveCSS('animation-name', 'none')
      await expect(page.locator('#hero-title')).toHaveCSS('opacity', '1')
      await expect(page.locator('#hero-title')).toHaveCSS('clip-path', 'none')
    }
    await expect(page.getByRole('button', { name: 'Click to reveal dates', exact: true })).toBeVisible()
  }
})

test('event filters, outfit dialog and exact warm regards follow celebrations directly', async ({ page }) => {
  await celebrations(page)
  await page.getByRole('button', { name: '30 January', exact: true }).click()
  await expect(page.locator('.episode-card')).toHaveCount(2)
  await expect(page.locator('.episode-rail')).toContainText('Band Baaja Mehendi')
  await expect(page.locator('.episode-rail')).toContainText('Jhoom Barabar Jhoom')
  await page.getByRole('button', { name: '31 January', exact: true }).click()
  await expect(page.getByRole('button', { name: '31 January', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.episode-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Explore Ajab Haldi Ki Gazab Kahani' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText('Haldi and Carnival · 9:00 a.m. onwards')
  await expect(page.getByRole('dialog')).not.toContainText(/6:30 a\.m\.|10:00 a\.m\./)
  await expect(page.getByRole('dialog')).toContainText('Pastel shararas')
  await expect(page.getByRole('dialog')).not.toContainText(/Green Heaven|Bhubaneswar/)
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Explore the look', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next: warm regards', exact: true }).click()
  const regards = page.locator('#warm-regards')
  await expect(regards).toBeFocused()
  expect(await regards.evaluate(element => element.previousElementSibling?.id)).toBe('episodes')
  await expect(page.locator('#guest-guide, .guest-section')).toHaveCount(0)
  await expect(regards.getByRole('heading', { name: 'With Love and Warm Regards', exact: true })).toHaveCount(1)
  await expect(regards.getByRole('heading', { name: 'Rsvp.', exact: true })).toHaveCount(1)
  await expect(regards.locator('.regards-contacts > p')).toHaveText('For any assistance or queries, kindly contact:')
  await expect(regards.getByRole('heading', { name: 'With Best Compliments from', exact: true })).toHaveCount(1)
  await expect(regards.locator('.regards-family-name')).toHaveText('The Patnaik Family')
  await expect(regards.locator('.regards-family > p').last()).toHaveText('Srinibash, Sutapa, Suhani and Subhasis')
  await expect(regards.locator('.regards-message')).toHaveText('Your presence and blessings will make the celebrations even more memorable!')
  await expect(regards.locator('.regards-contact-copy > span').first()).toHaveCSS('color', 'rgb(255, 242, 227)')
  await expect(regards.locator('.regards-contact-copy > span').nth(1)).toHaveCSS('color', 'rgb(237, 204, 147)')
  await expect(regards).not.toContainText(/Good company|Great celebrations|LOCAL DEMO|NOTHING IS SUBMITTED/)
  await expect(page.getByRole('button', { name: 'Preview RSVP', exact: true })).toHaveCount(0)
  await expect(page.locator('form')).toHaveCount(0)
  for (const viewport of [...phoneViewports, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.getByRole('button', { name: 'Next: warm regards', exact: true }).click()
    for (const locator of [regards.locator('h2'), regards.locator('.regards-details'), regards.locator('.regards-message')]) await fullyBelowHeader(page, locator)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('reduced motion and narrow screens remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await enter(page, false)
  async function checkWidths(section: string) {
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${section} must not overflow at ${width}px`).toBe(true)
    }
  }
  await checkWidths('Hidden dates')
  await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('.scratch-section').getByRole('status')).toContainText('It’s a date!')
  await checkWidths('Revealed dates')
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await page.getByRole('button', { name: 'Click to reveal venue', exact: true }).click()
  await page.getByRole('button', { name: 'Next: celebrations', exact: true }).click()
  await checkWidths('Celebrations rail')
  await page.getByRole('button', { name: 'Explore Band Baaja Mehendi', exact: true }).click()
  await checkWidths('Event outfit dialog')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await checkWidths('Revealed venue')
  await page.getByRole('button', { name: 'Next: warm regards', exact: true }).click()
  await checkWidths('Warm regards')
  await page.locator('.finale').scrollIntoViewIfNeeded()
  await checkWidths('Finale')
})

test('formal family invitation and resort directions are present', async ({ page }) => {
  await venue(page)
  await page.getByRole('button', { name: 'Click to reveal venue' }).click()
  await expect(page.locator('#venue')).toContainText('Raghunathpur, Bhubaneswar, Odisha')
  const contacts = page.locator('#warm-regards .regards-contacts')
  for (const [name, phone, href] of [
    ['Srinibash Patnaik', '+91-9937556812', 'tel:+919937556812'],
    ['Sutapa Patnaik', '+91-9438532193', 'tel:+919438532193'],
    ['Subhasis Pattnaik', '+91-8117886632', 'tel:+918117886632'],
  ]) {
    await expect(contacts.getByRole('link', { name: `${name} | ${phone}`, exact: true })).toHaveAttribute('href', href)
  }
  await expect(page.locator('.finale')).toContainText('The Patnaik Family')
  await expect(page.locator('.finale')).toContainText('Srinibash, Sutapa, Suhani and Subhasis')
  await expect(page.getByRole('link', { name: 'Get directions', exact: true })).toHaveAttribute('href', /query_place_id=ChIJ863ftVcPGToR996yN-jvYJA/)
  await expect(page.locator('#venue iframe')).toHaveAttribute('title', 'Google Map — Green Heaven Resort, Bhubaneswar')
  await expect(page.locator('#venue iframe')).toHaveAttribute('src', /!1s0x3a190f57b5dfadf3:0x9060efe837b2def7/)
  await expect(page.locator('#venue iframe')).toHaveAttribute('src', /!2d85\.8234607!3d20\.386727/)
  await page.getByRole('button', { name: 'aastheticsohlmates home', exact: true }).click()
  await page.getByRole('button', { name: 'Click to unfold the celebrations' }).click()
  await expect(page.getByRole('dialog')).not.toContainText('Both families')
  await expect(page.getByRole('dialog')).toContainText('Smt. Sutapa and Shri Srinibash Patnaik')
  await expect(page.getByRole('dialog')).toContainText('Smt. Kanchan and Late Shri Sunil Gami')
  await expect(page.getByRole('dialog')).toContainText('request the honour of your esteemed presence')
  await expect(page.getByRole('dialog')).not.toContainText(/January|2027/)
  await expect(page.getByRole('dialog').locator('.invite-date')).toHaveCount(0)
})

test('reveals accumulate in vertical order and scrolling down and back preserves content and state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openInvitation(page)
  const shortcuts = page.getByRole('navigation', { name: 'Invitation shortcuts' })
  const header = page.getByRole('navigation', { name: 'Explore the invitation' })
  const sections = ['#home', '#story', '#dates.scratch-section', '#venue', '#episodes', '#warm-regards']
  async function cumulativeSections(count: number) {
    let previousBottom = -1
    for (const selector of sections.slice(0, count)) {
      const section = page.locator(selector)
      await expect(section).toHaveCount(1)
      await expect(section).toBeVisible()
      const bounds = await section.evaluate(element => {
        const rect = element.getBoundingClientRect()
        return { top: rect.top + scrollY, bottom: rect.bottom + scrollY }
      })
      expect(bounds.top, `${selector} follows the previous section`).toBeGreaterThanOrEqual(previousBottom)
      previousBottom = bounds.bottom
    }
    for (const selector of sections.slice(count)) await expect(page.locator(selector)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Click to unfold the celebrations', exact: true })).toHaveCount(1)
    await expect(page.getByRole('button', { name: /^(Back|Finish & review)$/ })).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: /Visited steps|wizard/i })).toHaveCount(0)
    await expect(page.locator('[aria-current="step"], [data-step-focus], .journey-progress, .journey-review, .journey-complete')).toHaveCount(0)
  }
  await expect(shortcuts).toHaveCount(0)
  await expect(header).toHaveCount(0)
  await cumulativeSections(1)
  await expect(page.locator('.hero-buttons button')).toHaveCount(1)
  await expect(page.locator('.journey-actions')).toHaveCount(0)
  await watchTeaser(page)
  await cumulativeSections(2)
  await expect(shortcuts).toHaveCount(0)
  await expect(page.locator('#teaser-title')).toBeInViewport()
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Continue without video', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Click to reveal dates', exact: true })).toHaveCount(0)
  await playTeaser(page)
  await expect(page.getByRole('button', { name: 'Continue without video', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await cumulativeSections(3)
  await expect(shortcuts).toHaveCount(0)
  await focusedSectionIsAligned(page, '#scratch-title')
  const scrollBeforeReveal = await page.evaluate(() => scrollY)
  const headerBeforeReveal = await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().height)
  expect(scrollBeforeReveal).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Next: celebrations', exact: true })).toHaveCount(0)
  const reveal = page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true })
  await reveal.focus()
  await page.keyboard.press('Enter')
  await cumulativeSections(4)
  // Responsive header reflow and scroll anchoring can shift the offset when
  // navigation appears; the reveal must retain this section, not reset to home.
  await datesRevealKeepsPosition(page, scrollBeforeReveal, headerBeforeReveal)
  await expect(shortcuts).toHaveCount(0)
  await expect(header).toHaveCount(0)
  await expect(page.locator('#wardrobe, .wardrobe-tabs, #outfit-panel')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^(Outfits|Choose your outfits|Discover venue|Explore the look)$/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^(Outfits|Choose your outfits|Discover venue|Explore the look)$/ })).toHaveCount(0)
  await expect(page.locator('#dates').getByRole('button', { name: 'Next: the venue', exact: true })).toHaveCount(1)
  await expect(page.locator('#venue').getByRole('button', { name: 'Next: celebrations', exact: true })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(/Green Heaven|Bhubaneswar/)
  await expect(page.locator('#venue iframe')).toHaveCount(0)
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await focusedSectionIsAligned(page, '#venue')
  await page.getByRole('button', { name: 'Click to reveal venue', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Get directions', exact: true })).toBeFocused()
  await fullyBelowHeader(page, page.locator('#venue-title'))
  await expect(page.getByTitle('Google Map — Green Heaven Resort, Bhubaneswar')).toHaveCount(1)
  await expect(page.locator('.destination-reveal')).toHaveCount(0)
  await cumulativeSections(sections.length)
  await page.getByRole('button', { name: 'Next: celebrations', exact: true }).click()
  await focusedSectionIsAligned(page, '#episodes')
  await page.getByRole('button', { name: 'Next: warm regards', exact: true }).click()
  await focusedSectionIsAligned(page, '#warm-regards')
  await expect(page.locator('#guest-guide')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const target of ['#dates', '#story', '#home']) {
    await page.locator(target).evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await expect(page.locator(target)).toBeInViewport()
    await cumulativeSections(sections.length)
  }
  await expect(page.locator('.scratch-date')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('canvas.foil')).toHaveClass(/revealed/)
  await expect(page.locator('.scratch-section').getByRole('status')).toContainText('30–31 January 2027')
  await expect(reveal).toHaveCount(0)
  await expect(header).toHaveCount(0)
  await cumulativeSections(sections.length)
})

test('venue map and navigation stay within one frame at intermediate and landscape sizes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 740 }, { width: 500, height: 750 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await venue(page)
    await focusedSectionIsAligned(page, '#venue')
    await page.evaluate(() => document.fonts.ready)
    const frameBefore = await page.locator('#venue').boundingBox()
    for (const revealed of [false, true]) {
      if (revealed) await page.getByRole('button', { name: 'Click to reveal venue', exact: true }).click()
      for (const locator of [page.locator('#venue-title'), page.locator('.venue-map'), page.locator('.venue-action')]) {
        await fullyBelowHeader(page, locator)
      }
      if (revealed) await fullyBelowHeader(page, page.locator('#venue .section-next'))
      const frame = await page.locator('#venue').boundingBox()
      const header = await page.locator('.site-header').boundingBox()
      expect(frame).toEqual(frameBefore)
      expect(Math.abs(frame!.height - (viewport.height - header!.height))).toBeLessThanOrEqual(1)
      const map = await page.locator('.venue-map').boundingBox()
      const nextTop = await page.locator('#venue .section-next').evaluate(element => element.getBoundingClientRect().top)
      expect(map!.height).toBeGreaterThan(80)
      expect(map!.y + map!.height).toBeLessThanOrEqual(nextTop + 1)
    }
  }
})

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`dates, episode essentials and venue fit ${viewport.width}x${viewport.height} below the sticky header`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize(viewport)
    // The continuation invokes showDates: check the landing position before
    // any action that could auto-scroll an out-of-view control into sight.
    await enter(page, false)
    await expect(page.locator('#dates')).toHaveClass(/scratch-section/)
    await focusedSectionIsAligned(page, '#scratch-title')
    const dates = page.locator('#dates')
    const reveal = dates.getByRole('button', { name: 'Click to reveal dates', exact: true })
    for (const locator of [page.locator('#scratch-title'), dates.locator('.scratch-card'), reveal]) {
      await fullyBelowHeader(page, locator)
    }
    const previousScroll = await page.evaluate(() => scrollY)
    const previousHeaderHeight = await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().height)
    await reveal.click()
    await expect(dates.getByRole('status')).toContainText('30–31 January 2027')
    await fullyBelowHeader(page, dates.locator('.countdown'))
    await expect(dates.locator('.countdown strong')).toHaveCount(4)
    await datesRevealKeepsPosition(page, previousScroll, previousHeaderHeight)
    const explore = dates.getByRole('button', { name: 'Next: the venue', exact: true })
    for (const locator of [
      page.locator('#scratch-title'), dates.locator('.scratch-card'),
      dates.getByRole('button', { name: 'Save the dates', exact: true }), explore,
    ]) await fullyBelowHeader(page, locator)

    await explore.click()
    await focusedSectionIsAligned(page, '#venue')
    await expect(page.locator('#venue')).toHaveCSS('color', 'rgb(255, 243, 230)')
    await expect(page.locator('#venue')).toHaveCSS('background-color', 'rgb(56, 19, 33)')
    await expect(page.locator('#venue-title')).toHaveCSS('color', 'rgb(255, 243, 230)')
    await expect(page.locator('.venue-intro')).toHaveCSS('color', 'rgb(217, 185, 180)')
    await expect(page.locator('#episodes')).toHaveCount(0)
    await fullyBelowHeader(page, page.locator('#venue-title'))
    const revealDestination = page.getByRole('button', { name: 'Click to reveal venue', exact: true })
    await fullyBelowHeader(page, revealDestination)
    await expect(page.locator('.venue-intro')).toHaveText('Reveal the venue for the wedding celebrations.')
    await expect(page.locator('.venue-seal')).toBeVisible()
    await expect(page.locator('.venue-concealed-label')).toHaveText('Venue under wraps')
    const atmosphere = page.locator('#venue .venue-atmosphere')
    await expect(atmosphere).toHaveAttribute('aria-hidden', 'true')
    await expect(atmosphere).toHaveCSS('position', 'absolute')
    await expect(atmosphere).toHaveCSS('pointer-events', 'none')
    await expect(atmosphere.locator('img')).toHaveCount(2)
    for (const image of await atmosphere.locator('img').all()) {
      await expect(image).toHaveAttribute('alt', '')
      await expect(image).toHaveCSS('filter', 'none')
      await expect(image).toHaveCSS('transition-duration', '0s')
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth === 1280 && element.naturalHeight === 640)).toBe(true)
    }
    await expect(atmosphere.locator('.venue-atmosphere-veiled')).toHaveCSS('opacity', '0.82')
    await expect(atmosphere.locator('.venue-atmosphere-revealed')).toHaveCSS('opacity', '0')
    await page.evaluate(() => document.fonts.ready)
    const venueElements = page.locator('#venue-title, .venue-intro, .venue-layout, .venue-map, .venue-action, #venue .section-next')
    const venueBefore = await venueElements.evaluateAll(elements => elements.map(element => {
      const bounds = element.getBoundingClientRect()
      return { top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }
    }))
    const scrollBeforeVenue = await page.evaluate(() => scrollY)
    await revealDestination.click()
    await expect(atmosphere.locator('.venue-atmosphere-veiled')).toHaveCSS('opacity', '0')
    await expect(atmosphere.locator('.venue-atmosphere-revealed')).toHaveCSS('opacity', '0.88')
    await expect(page.getByRole('link', { name: 'Get directions', exact: true })).toBeFocused()
    await expect(page.locator('#venue h3')).toHaveCSS('color', 'rgb(237, 201, 147)')
    await expect(page.locator('#venue .venue-city')).toHaveCSS('color', 'rgb(235, 215, 204)')
    await expect(page.locator('#venue .map-caption')).toHaveCSS('background-color', 'rgb(48, 21, 32)')
    await expect(page.locator('.venue-intro')).toHaveText('Reveal the venue for the wedding celebrations.')
    await expect(page.locator('.venue-seal, .venue-concealed-label')).toHaveCount(0)
    expect(await page.evaluate(() => scrollY)).toBe(scrollBeforeVenue)
    await expect.poll(() => venueElements.evaluateAll((elements, previous) => elements.every((element, index) => {
      const bounds = element.getBoundingClientRect()
      return Math.abs(bounds.top - previous[index].top) <= 1 && Math.abs(bounds.left - previous[index].left) <= 1
        && Math.abs(bounds.width - previous[index].width) <= 1 && Math.abs(bounds.height - previous[index].height) <= 1
    }), venueBefore), { message: 'Venue reveal must not move or resize the page content' }).toBe(true)
    await expect.poll(() => page.locator('#episodes').evaluate(element => element.getBoundingClientRect().top >= innerHeight - 1)).toBe(true)
    for (const locator of [
      page.locator('#venue-title'), page.locator('#venue').getByRole('heading', { name: 'The Green Heaven Resort', exact: true }),
      page.locator('#venue .venue-city'), page.getByRole('link', { name: 'Get directions', exact: true }),
      page.locator('#venue .venue-map'), page.getByTitle('Google Map — Green Heaven Resort, Bhubaneswar'),
    ]) await fullyBelowHeader(page, locator)
    await fullyBelowHeader(page, page.getByRole('button', { name: 'Next: celebrations', exact: true }))
    await expect(page.getByRole('button', { name: 'Next: celebrations', exact: true })).toHaveCSS('color', 'rgb(48, 19, 30)')
    await expect(page.getByRole('button', { name: 'Next: celebrations', exact: true })).toHaveCSS('background-color', 'rgb(234, 212, 179)')
    expect(await page.getByRole('button', { name: 'Next: celebrations', exact: true }).evaluate(button => {
      const reference = document.querySelector('#dates .section-next .button')!
      const actual = getComputedStyle(button)
      const expected = getComputedStyle(reference)
      return ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-radius', 'gap'].every(property => actual.getPropertyValue(property) === expected.getPropertyValue(property))
    }), 'Venue continuation must use the same typography and spacing as the dates continuation').toBe(true)
    await page.getByRole('button', { name: 'Next: celebrations', exact: true }).click()
    await focusedSectionIsAligned(page, '#episodes')
    const episodes = page.locator('#episodes')
    await expect(episodes).toHaveCSS('color', 'rgb(247, 236, 223)')
    const cards = episodes.locator('.episode-card')
    const guestPlans = page.getByRole('button', { name: 'Next: warm regards', exact: true })
    await expect(cards).toHaveCount(4)
    await expect(guestPlans).toHaveCount(1)
    for (const locator of [
      episodes.getByRole('heading', { name: 'The celebrations.', exact: true }),
      episodes.locator('.filters'), episodes.locator('.episode-rail'),
      cards.first(), cards.first().locator('.artwork'),
      cards.first().locator('.episode-info'), cards.first().locator('.episode-details'), cards.first().locator('.episode-note'), guestPlans,
    ]) await fullyBelowHeader(page, locator)
    // The rail intentionally clips later cards horizontally on phones. All
    // cards must still fit vertically; don't demand four visible columns.
    expect(await cards.evaluateAll(elements => elements.every(element => {
      const badge = element.querySelector('.episode-badge')
      const category = element.querySelector('.poster-title > span')
      return !!badge && !!category
        && Math.abs(element.getBoundingClientRect().top - elements[0].getBoundingClientRect().top) <= 1
        && category.getBoundingClientRect().top >= badge.getBoundingClientRect().bottom + 4
    })), 'Poster tops must align and episode badges must not overlap category labels').toBe(true)
    await expect.poll(() => cards.evaluateAll(elements => {
      const headerBottom = document.querySelector('.site-header')!.getBoundingClientRect().bottom
      return elements.every(element => {
        const rect = element.getBoundingClientRect()
        return rect.height > 0 && rect.top >= headerBottom - 1 && rect.bottom <= innerHeight + 1
      })
    }), { message: 'Every episode card must fit the available height without vertical clipping' }).toBe(true)

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  })
}

test('all four event dialogs retain branding and display invitation content with their own outfits and downloadable planner', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await celebrations(page)
  const originalEvents = [
    {
      name: 'Band Baaja Mehendi', tagline: 'Dhol, mehendi aur dher saari masti.',
      short: 'A little henna. A whole lot of happiness.',
      description: 'A moment of golden hues, when love is intricately woven into exquisite patterns of henna.',
      times: ['Mehendi · 9:00 a.m. onwards', 'Followed by lunch'],
      men: 'Kurta-pyjama sets with Nehru jackets.',
      women: 'Lehengas, shararas, ghararas or Anarkalis.',
      mood: 'Playful prints, flowing silhouettes, and festive colour.',
      colors: ['Emerald', 'Rani pink', 'Marigold', 'Ivory'],
    },
    {
      name: 'Jhoom Barabar Jhoom', tagline: 'All the drama. All the dance.',
      short: 'For the main characters on the dance floor.',
      description: 'An evening of celebratory melodies, filled with music, dance, boundless fun and laughter.',
      times: ['Sangeet · 6:00 p.m. onwards', 'Followed by dinner'],
      men: 'Bandhgala suits, tuxedos or tailored suits.',
      women: 'Sequined sarees, shimmer lehengas or metallic gowns.',
      mood: 'A little shimmer is good. A lot of shimmer is even better.',
      colors: ['Midnight', 'Wine', 'Champagne', 'Silver'],
    },
    {
      name: 'Ajab Haldi Ki Gazab Kahani', tagline: 'Colour, flowers, and a little friendly chaos.',
      short: 'Light outfits. A colourful celebration.',
      description: 'A sunshine soiree where blooming florals, vibrant turmeric hues and joyous celebrations come together in a carnival of flowers.',
      times: ['Haldi and Carnival · 9:00 a.m. onwards', 'Followed by lunch'],
      men: 'Linen or floral pastel shirts with chinos and blazers, or kurta-pyjama sets.',
      women: 'Pastel shararas, floral co-ords or skirts with crop tops.',
      mood: 'Light, breezy, and made for a carnival. Think pastels and florals.',
      colors: ['Sunshine', 'Peach', 'Sage', 'Blush'],
    },
    {
      name: 'Two Souls, One Love', tagline: 'Two families. One wedding.',
      short: 'The main event: Wedding and Reception.',
      description: 'With the beats of the dhol and hearts full of joy, join us for the vibrant rhythms and celebrations of the baraat procession. Witness the beautiful exchange of garlands as two hearts embrace a promise of eternity. An enchanting evening of warm smiles, heartfelt blessings and memories to cherish forever. Join us as the couple takes their sacred vows around the holy fire, beginning an eternal journey.',
      times: ['Baraat · 5:00 p.m. onwards', 'Varmala · 7:30 p.m. onwards', 'Reception · 7:30 p.m. onwards', 'Pheras · 11:00 p.m. onwards'],
      men: 'Sherwanis, bandhgala suits, achkans or silk kurtas.',
      women: 'Lehengas or silk sarees.',
      mood: 'Heritage with high glamour. North and South Indian elegance.',
      colors: ['Burgundy', 'Antique gold', 'Forest', 'Ivory'],
    },
  ]
  for (const event of originalEvents) {
    const card = page.getByRole('button', { name: `Explore ${event.name}`, exact: true })
    await expect(card.locator('.episode-note')).toHaveText(event.short)
    await card.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toHaveAccessibleName(event.name)
    if (event.name === 'Two Souls, One Love') {
      await expect(dialog.locator('.eyebrow')).toContainText('Wedding and Reception')
      await expect(dialog).not.toContainText('Varmala & Shaadi')
      await expect(dialog.locator('.event-dress-code')).not.toContainText(/Banarasi|Kanjeevaram|Paithani/)
    }
    await expect(dialog).toHaveCSS('background-image', /rgb\(114, 45, 60\)/)
    await expect(dialog.locator('.event-modal-copy > p').first()).toHaveCSS('color', 'rgb(226, 191, 141)')
    for (const copy of [event.description, event.men, event.women]) {
      await expect(dialog).toContainText(copy)
    }
    await expect(dialog).not.toContainText(event.mood)
    await expect(dialog.getByRole('heading', { name: event.name, exact: true })).toHaveCount(1)
    await expect(dialog).not.toContainText(event.short)
    await expect(dialog.locator('.event-description')).toHaveText(event.description)
    expect(await dialog.locator('.event-modal-copy').evaluate(element => {
      const schedule = element.querySelector('.event-facts')
      const outfits = element.querySelector('.event-outfit-title')
      const description = element.querySelector('.event-description')
      const title = element.querySelector('#modal-title')
      return !!schedule && !!outfits && !!description
        && title?.nextElementSibling === description
        && !!(description.compareDocumentPosition(schedule) & Node.DOCUMENT_POSITION_FOLLOWING)
        && !!(schedule.compareDocumentPosition(outfits) & Node.DOCUMENT_POSITION_FOLLOWING)
    })).toBe(true)
    for (const detail of event.times) await expect(dialog).toContainText(detail)
    await expect(dialog).not.toContainText('Timings to be announced')
    await expect(dialog).not.toContainText(/Green Heaven|Bhubaneswar/)
    await expect(dialog.locator('.palette')).toHaveCount(0)
    await expect(dialog).not.toContainText(/Choose your own colours|These are ideas, not rules|What to wear/)
    await expect(dialog).toContainText('Dress code')
    if (event.name === 'Ajab Haldi Ki Gazab Kahani') {
      await expect(dialog.locator('.event-dress-code > div')).toHaveCount(1)
      await expect(dialog.locator('.event-dress-code h4')).toHaveCount(0)
      await expect(dialog.locator('.event-dress-code')).not.toContainText('Suits or sarees.')
    }
    await expect(dialog).toContainText('Men:')
    await expect(dialog).toContainText('Women:')
    await expect(dialog.getByRole('button', { name: 'Explore the look', exact: true })).toHaveCount(0)
    await expect(dialog.getByRole('link', { name: 'Explore the look', exact: true })).toHaveCount(0)
    await expect(dialog.getByRole('link')).toHaveCount(0)
    await expect(dialog.locator('.modal-close')).toHaveCSS('background-color', 'rgb(53, 27, 36)')
    await expect(dialog.locator('.modal-close')).toHaveCSS('color', 'rgb(226, 191, 141)')
    for (const viewport of [...phoneViewports, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      expect(await dialog.evaluate(element => element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1), `${event.name} must fit without scrolling at ${viewport.width}x${viewport.height}`).toBe(true)
      await fullyInViewport(dialog.locator('.event-dress-code'))
      await fullyInViewport(dialog.getByRole('button', { name: 'Close dialog', exact: true }))
    }
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(card).toBeFocused()
  }
  await expect(page.locator('#wardrobe, [role="tablist"], [role="tabpanel"]')).toHaveCount(0)
  await expect(page.locator('#episodes')).not.toContainText('TWO DAYS. FOUR CELEBRATIONS.')
  const planner = page.locator('#episodes').getByRole('link', { name: 'Wardrobe planner', exact: true })
  await expect(planner).toHaveCount(1)
  await expect(planner).toHaveAttribute('href', '/media/wardrobe-planner.pdf')
  await expect(planner).toHaveAttribute('download', /.*/)
  const downloadPromise = page.waitForEvent('download')
  await planner.click()
  const download = await downloadPromise
  expect(await download.failure()).toBeNull()
  expect(download.suggestedFilename()).toBe('wardrobe-planner.pdf')
  const path = await download.path()
  expect(path).not.toBeNull()
  const data = await readFile(path!)
  expect(data.subarray(0, 5).toString()).toBe('%PDF-')
})

test('hero composition is unchanged when revisited after revealing dates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [...phoneViewports, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await openInvitation(page)
    await page.evaluate(() => document.fonts.ready)
    const elements = page.locator('.site-header, .site-header .brand, #home, .hero-art img, .hero-content, #hero-title, .hero-buttons')
    const before = await elements.evaluateAll(nodes => nodes.map(element => {
      const bounds = element.getBoundingClientRect()
      return { top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }
    }))
    await watchTeaser(page)
    await page.getByRole('button', { name: 'Continue without video', exact: true }).click()
    await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
    await page.getByRole('button', { name: 'aastheticsohlmates home', exact: true }).click()
    await expect(page.locator('#home')).toBeFocused()
    await expect(page.getByRole('navigation', { name: 'Explore the invitation' })).toHaveCount(0)
    await expect(page.locator('.hero-bottom')).toHaveCount(0)
    await expect.poll(() => elements.evaluateAll((nodes, previous) => nodes.every((element, index) => {
      const bounds = element.getBoundingClientRect()
      return Math.abs(bounds.top - previous[index].top) <= 2 && Math.abs(bounds.left - previous[index].left) <= 2
        && Math.abs(bounds.width - previous[index].width) <= 2 && Math.abs(bounds.height - previous[index].height) <= 2
    }), before), { message: 'Hero layout must stay identical after reveals' }).toBe(true)
    await fullyBelowHeader(page, page.locator('.hero-buttons .button'))
  }
})

test('scrolling remains continuous and date reveals do not change header height', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.setViewportSize({ width: 390, height: 844 })
  await openInvitation(page)
  const headerHeight = await page.locator('.site-header').evaluate(element => element.getBoundingClientRect().height)
  const headerControls = page.locator('.site-header .brand, .site-header .music-control button')
  const originalPositions = await headerControls.evaluateAll(elements => elements.map(element => {
    const bounds = element.getBoundingClientRect()
    return { top: bounds.top, left: bounds.left, width: bounds.width, height: bounds.height }
  }))
  expect(headerHeight).toBeLessThan(90)
  await expect(page.locator('.site-header')).toHaveCSS('backdrop-filter', 'none')
  await watchTeaser(page)
  await fullyBelowHeader(page, page.locator('.journey-film video'))
  await page.getByRole('button', { name: 'Continue without video', exact: true }).click()
  await focusedSectionIsAligned(page, '#scratch-title')
  const before = await page.evaluate(() => scrollY)
  await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('.site-header')).toHaveCSS('height', `${headerHeight}px`)
  await expect(page.locator('.site-header nav')).toHaveCount(0)
  await expect.poll(() => headerControls.evaluateAll((elements, previous) => elements.every((element, index) => {
    const bounds = element.getBoundingClientRect()
    return Math.abs(bounds.top - previous[index].top) <= 2 && Math.abs(bounds.left - previous[index].left) <= 2
      && Math.abs(bounds.width - previous[index].width) <= 2 && Math.abs(bounds.height - previous[index].height) <= 2
  }), originalPositions)).toBe(true)
  expect(Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThan(4)
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await page.getByRole('button', { name: 'Click to reveal venue', exact: true }).click()
  await page.getByRole('button', { name: 'Next: celebrations', exact: true }).click()
  await focusedSectionIsAligned(page, '#episodes')
  await page.mouse.wheel(0, 350)
  await expect(page.locator('#dates, #story, #episodes')).toHaveCount(3)
  for (const section of await page.locator('.scroll-reveal').all()) {
    await expect(section).toHaveCSS('opacity', '1')
    await expect(section).toHaveCSS('transform', 'none')
  }
})

test('teaser starts fullscreen from its play button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openInvitation(page)
  await watchTeaser(page)
  const video = page.getByLabel('Our teaser', { exact: true })
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.readyState >= 2)).toBe(true)
  await page.getByRole('button', { name: 'Play teaser', exact: true }).click()
  await expect.poll(() => video.evaluate(clip => document.fullscreenElement === clip)).toBe(true)
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => !clip.paused && clip.currentTime > 0)).toBe(true)
  await expect(page.getByRole('button', { name: 'Pause background music', exact: true })).toHaveCount(0)
  await page.evaluate(() => document.exitFullscreen())
  await video.evaluate((clip: HTMLVideoElement) => clip.pause())
  await fullyInViewport(page.getByRole('button', { name: 'Click to reveal dates', exact: true }))
})

test('native video play control starts the teaser fullscreen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openInvitation(page)
  await watchTeaser(page)
  const video = page.getByLabel('Our teaser', { exact: true })
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.readyState >= 2)).toBe(true)
  await video.click()
  await expect.poll(() => video.evaluate(clip => document.fullscreenElement === clip)).toBe(true)
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => !clip.paused && clip.currentTime > 0)).toBe(true)
  await page.evaluate(() => document.exitFullscreen())
  await video.evaluate((clip: HTMLVideoElement) => clip.pause())
  await fullyInViewport(page.getByRole('button', { name: 'Click to reveal dates', exact: true }))
})

test('teaser fullscreen rejection keeps inline playback available', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLVideoElement.prototype.requestFullscreen = () => Promise.reject(new Error('Fullscreen unavailable'))
  })
  await openInvitation(page)
  await watchTeaser(page)
  const video = page.getByLabel('Our teaser', { exact: true })
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => clip.readyState >= 2)).toBe(true)
  await page.getByRole('button', { name: 'Play teaser', exact: true }).click()
  await expect.poll(() => video.evaluate((clip: HTMLVideoElement) => !clip.paused && clip.currentTime > 0)).toBe(true)
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull()
  await expect(page.getByRole('status')).toHaveCount(0)
  await page.getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('#scratch-title')).toBeFocused()
})

test('inline teaser uses a portrait video and frame without autoplay', async ({ page }) => {
  await openInvitation(page)
  await watchTeaser(page)
  await expect(page.locator('#teaser-title')).toBeFocused()
  await expect(page.locator('#teaser-title')).toHaveCSS('outline-style', 'none')
  await expect(page.locator('footer, .footer-hashtag')).toHaveCount(0)
  await expect(page.locator('#story')).toHaveCSS('color', 'rgb(247, 236, 223)')
  for (const viewport of [...phoneViewports, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.getByRole('button', { name: 'aastheticsohlmates home', exact: true }).click()
    await watchTeaser(page)
    await focusedSectionIsAligned(page, '#teaser-title')
  }
  const video = page.locator('.journey-teaser video[aria-label="Our teaser"]')
  await expect(video).toHaveAttribute('src', '/media/teaser-portrait.mp4')
  await expect(video).toHaveAttribute('poster', '/media/teaser-first-frame.jpg')
  await expect(page.locator('.journey-film button')).toHaveCount(0)
  await fullyInViewport(video)
  await fullyInViewport(page.getByRole('button', { name: 'Continue without video', exact: true }))
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.videoHeight > element.videoWidth && element.videoWidth > 0)).toBe(true)
  expect(await video.evaluate((clip: HTMLVideoElement) => clip.paused && clip.currentTime === 0 && clip.playsInline && clip.controls)).toBe(true)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const bounds = (await video.boundingBox())!
  expect(bounds.height).toBeGreaterThan(bounds.width)
})

test('unavailable inline teaser allows continuing without trapping guests', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/media/teaser-portrait.mp4', route => route.abort())
  await openInvitation(page)
  await watchTeaser(page)
  await expect(page.locator('.journey-teaser').getByRole('status')).toHaveText('Video unavailable. Continue to the dates below.')
  await expect(page.getByRole('button', { name: 'Play teaser', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await expect(page.locator('#scratch-title')).toBeFocused()
  await page.locator('#dates').getByRole('button', { name: 'Click to reveal dates', exact: true }).click()
  await page.getByRole('button', { name: 'Next: the venue', exact: true }).click()
  await page.getByRole('button', { name: 'Click to reveal venue', exact: true }).click()
  await page.getByRole('button', { name: 'Next: celebrations', exact: true }).click()
  await expect(page.locator('.episode-card')).toHaveCount(4)
})

test('celebrations preserve the four individual original poster cards and scrollable rail', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await celebrations(page)
  await expect(page.locator('.celebration-intro')).toHaveText('Henna, music, colour and the wedding.')
  await expect(page.locator('.royal-flourish, .royal-arch')).toHaveCount(0)
  await expect(page.locator('.royal-backdrop, .royal-garland')).toHaveCount(2)
  for (const section of ['#home', '#story', '#venue', '#warm-regards']) await expect(page.locator(`${section} .celebration-ornaments`)).toHaveCount(0)
  for (const section of ['#dates', '#episodes']) {
    await expect(page.locator(`${section} .celebration-ornaments`)).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator(`${section} .celebration-ornaments`)).toHaveCSS('pointer-events', 'none')
  }
  const rail = page.locator('#episodes .episode-rail')
  const cards = rail.locator(':scope > button.episode-card')
  const names = ['Band Baaja Mehendi', 'Jhoom Barabar Jhoom', 'Ajab Haldi Ki Gazab Kahani', 'Two Souls, One Love']
  await expect(cards).toHaveCount(4)
  for (const [index, name] of names.entries()) {
    const card = cards.nth(index)
    await expect(card).toHaveAttribute('aria-label', `Explore ${name}`)
    await expect(card).toHaveAttribute('aria-haspopup', 'dialog')
    await expect(card.locator('.episode-details')).toHaveText('Click here for event details')
    await expect(card.locator('.episode-details')).toBeVisible()
    await expect(card.locator('.artwork .poster-title h3')).toHaveText(name)
    await expect(card.locator('.artwork .episode-badge')).toHaveText(`EPISODE 0${index + 1}`)
    await expect(card.locator('.artwork .poster-logo')).toContainText('ORIGINAL')
    await expect(card.locator('.artwork .poster-play')).toHaveCount(0)
    await expect(card.locator('.episode-details .lucide-chevron-right')).toHaveCount(1)
    expect(await card.locator('.episode-details').evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const poster = element.previousElementSibling!.getBoundingClientRect()
      return bounds.height >= 44 && bounds.top >= poster.bottom - 1 && Math.abs(bounds.width - poster.width) <= 1
    })).toBe(true)
    await expect(card.locator('.episode-start')).toHaveText([
      'Mehendi · 9:00 a.m. onwards', 'Sangeet · 6:00 p.m. onwards',
      'Haldi and Carnival · 9:00 a.m. onwards', 'Baraat · 5:00 p.m. onwards',
    ][index])
    await expect(card.locator('.episode-info')).toContainText(index < 2 ? '30 JAN' : '31 JAN')
    await expect(card.locator('.episode-note')).not.toBeEmpty()
    await expect(card.locator('.episode-note')).toBeVisible()
  }
  // Wide desktop intentionally fits all four posters; tablet/mobile must retain the scrolling rail.
  await page.setViewportSize({ width: 768, height: 844 })
  await expect.poll(() => rail.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Next episodes', exact: true }).click()
  await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Previous episodes', exact: true }).click()
  await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBe(0)
  await expect(cards).toHaveCount(4)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(rail).toHaveCSS('scroll-snap-type', 'x mandatory')
  const previous = page.getByRole('button', { name: 'Previous episodes', exact: true })
  const next = page.getByRole('button', { name: 'Next episodes', exact: true })
  await expect(previous).toBeDisabled()
  for (let index = 0; index < 4; index++) {
    const geometry = await rail.evaluate(element => ({
      left: element.scrollLeft, max: element.scrollWidth - element.clientWidth,
      step: element.firstElementChild!.getBoundingClientRect().width + parseFloat(getComputedStyle(element).columnGap),
    }))
    if (geometry.left >= geometry.max - 1) break
    await expect(next).toBeEnabled()
    await next.click()
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThanOrEqual(Math.min(geometry.left + geometry.step, geometry.max) - 1)
  }
  await expect(next).toBeDisabled()
  await expect(previous).toBeEnabled()
  await page.getByRole('button', { name: '31 January', exact: true }).click()
  await expect(cards).toHaveCount(2)
  await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBe(0)
  await expect(previous).toBeDisabled()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(next).toBeDisabled()
  await page.setViewportSize({ width: 844, height: 390 })
  for (const card of await cards.all()) {
    expect(await card.locator('.artwork').evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(180)
    expect(await card.evaluate(element => {
      const badge = element.querySelector('.episode-badge')!.getBoundingClientRect()
      const title = element.querySelector('.poster-title')!.getBoundingClientRect()
      const poster = element.querySelector('.artwork')!.getBoundingClientRect()
      const action = element.querySelector('.episode-details')!.getBoundingClientRect()
      return title.top >= badge.bottom && title.bottom <= poster.bottom && action.top >= poster.bottom - 1 && action.height >= 44
    })).toBe(true)
  }
  await cards.first().focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(cards.first()).toBeFocused()
  const closing = page.getByRole('button', { name: 'Next: warm regards', exact: true })
  await closing.scrollIntoViewIfNeeded()
  await fullyBelowHeader(page, closing)
})