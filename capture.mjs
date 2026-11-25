import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const output = process.env.CAPTURE_DIR
const target = process.env.CAPTURE_URL
if (!output || !target) throw new Error('CAPTURE_URL and CAPTURE_DIR are required.')
let url
try { url = new URL(target) } catch { throw new Error('CAPTURE_URL must be an absolute URL.') }
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('CAPTURE_URL must use HTTP or HTTPS.')

const runtime = join(process.env.HOME, '.local/share/omgithub-playwright')
const require = createRequire(join(runtime, 'package.json'))
const { chromium } = require('playwright')
const config = JSON.parse(await (await import('node:fs/promises')).readFile(join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json'), 'utf8'))
if (process.platform === 'linux') {
  const display = await (await import('node:fs/promises')).readFile(join(runtime, 'display'), 'utf8')
  process.env.DISPLAY ||= `:${display.trim()}`
}
mkdirSync(output, { recursive: true })
const temporary = error => Object.assign(error, { exitCode: 75 })
let browser
try {
  browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 }).catch(temporary)
  for (const [name, width, height] of [['desktop', 1280, 900], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 }).catch(temporary)
    const defects = []
    page.on('pageerror', error => defects.push(`JavaScript error: ${error.message}`))
    page.on('response', response => {
      const responseUrl = new URL(response.url())
      if (responseUrl.origin !== url.origin || responseUrl.pathname === '/favicon.ico' || response.status() < 400) return
      defects.push(`HTTP ${response.status()} for ${response.url()}`)
    })
    let response
    try { response = await page.goto(url.href, { waitUntil: 'load', timeout: 45000 }) }
    catch (error) { throw temporary(error) }
    if (!response?.ok()) {
      const status = response?.status()
      throw Object.assign(new Error(`Preview navigation failed${status ? ` with HTTP ${status}` : ''}.`), {
        exitCode: !status || status === 408 || status === 429 || status >= 500 ? 75 : 1
      })
    }
    try {
      await page.locator('body').waitFor({ state: 'visible', timeout: 10000 })
      await page.waitForFunction(() => document.fonts.status === 'loaded', { timeout: 10000 })
      await page.waitForTimeout(500)
    } catch (error) { throw Object.assign(new Error(`Rendered content did not become ready: ${error.message}`), { exitCode: 1 }) }
    const rendered = await page.evaluate(() => {
      const body = document.body
      const canvas = [...document.querySelectorAll('canvas')].some(item => item.width > 0 && item.height > 0 && item.getBoundingClientRect().width > 0)
      return Boolean(body && body.getBoundingClientRect().width > 0 && (body.innerText.trim().length > 0 || canvas))
    })
    if (!rendered) throw new Error(`The ${name} page is blank or has no rendered content.`)
    if (defects.length) throw new Error(`${name} rendering defects: ${defects.join('; ')}`)
    try { await page.screenshot({ path: join(output, `final-${name}.png`), fullPage: false, timeout: 30000 }) }
    catch (error) { throw temporary(error) }
    await page.close()
    console.log(`Captured ${name} view at ${width}x${height}: ${join(output, `final-${name}.png`)}`)
  }
} catch (error) {
  console.error(error)
  process.exitCode = error.exitCode || (browser?.isConnected() ? 1 : 75)
} finally {
  try { await browser?.close() } catch (error) { console.error(error); process.exitCode ||= 75 }
}
