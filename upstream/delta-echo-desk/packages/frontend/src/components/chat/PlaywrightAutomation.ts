import { getLogger } from '../../../../shared/logger'
import { runtime } from '@deltachat-desktop/runtime-interface'

const log = getLogger('renderer/PlaywrightAutomation')

/**
 * Class that provides browser automation capabilities using Playwright.
 * This allows Deep Tree Echo to perform web tasks and gather information.
 */
export class PlaywrightAutomation {
  private static instance: PlaywrightAutomation
  private initialized: boolean = false
  private browser: any = null
  private page: any = null

  private constructor() {}

  public static getInstance(): PlaywrightAutomation {
    if (!PlaywrightAutomation.instance) {
      PlaywrightAutomation.instance = new PlaywrightAutomation()
    }
    return PlaywrightAutomation.instance
  }

  /**
   * Initialize Playwright and launch a browser instance
   */
  public async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    try {
      // We'll use the Node.js integration to run the Playwright server
      const result = await runtime.runCommand(
        'npx playwright install chromium && node -e "console.log(\'Playwright is ready\')"'
      )

      log.info('Playwright initialization result:', result)
      this.initialized = true
      return true
    } catch (error) {
      log.error('Failed to initialize Playwright:', error)
      return false
    }
  }

  /**
   * Perform a web search and return the results
   * @param query Search query
   * @returns Search results as text
   */
  public async searchWeb(query: string): Promise<string> {
    if (!this.initialized) {
      const success = await this.initialize()
      if (!success) {
        return "I couldn't access web search capabilities at the moment."
      }
    }

    try {
      // Use DuckDuckGo as it's more privacy-focused
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`

      // We're using the runtime interface to run a Node.js script that uses Playwright
      const scriptPath = await this.createTempScript(`
        const { chromium } = require('playwright');
        (async () => {
          const browser = await chromium.launch();
          const page = await browser.newPage();
          await page.goto('${searchUrl}');
          await page.waitForSelector('.result__body');
          
          // Extract search results
          const results = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.result__body'));
            return items.map(item => {
              const title = item.querySelector('.result__title')?.textContent || '';
              const snippet = item.querySelector('.result__snippet')?.textContent || '';
              return { title, snippet };
            }).slice(0, 5); // Limit to top 5 results
          });
          
          await browser.close();
          console.log(JSON.stringify(results));
        })();
      `)

      const output = await runtime.runCommand(`node "${scriptPath}"`)

      // Parse the results
      try {
        const results = JSON.parse(output)
        return this.formatSearchResults(results)
      } catch (e) {
        log.error('Failed to parse search results:', e)
        return "I found some information, but I couldn't process it properly."
      }
    } catch (error) {
      log.error('Error searching the web:', error)
      return 'I encountered an error while trying to search the web.'
    }
  }

  /**
   * Take a screenshot of a webpage
   * @param url URL to capture
   * @returns Path to the screenshot file
   */
  public async captureWebpage(url: string): Promise<string> {
    if (!this.initialized) {
      const success = await this.initialize()
      if (!success) {
        throw new Error("Couldn't initialize Playwright")
      }
    }

    try {
      const scriptPath = await this.createTempScript(`
        const { chromium } = require('playwright');
        const path = require('path');
        
        (async () => {
          const browser = await chromium.launch();
          const page = await browser.newPage();
          await page.goto('${url}');
          
          // Wait for the page to be fully loaded
          await page.waitForLoadState('networkidle');
          
          // Take a screenshot
          const screenshotPath = path.join(process.cwd(), 'webpage_capture.png');
          await page.screenshot({ path: screenshotPath, fullPage: true });
          
          await browser.close();
          console.log(screenshotPath);
        })();
      `)

      const screenshotPath = await runtime.runCommand(`node "${scriptPath}"`)
      return screenshotPath.trim()
    } catch (error) {
      log.error('Error capturing webpage:', error)
      throw new Error('Failed to capture the webpage')
    }
  }

  /**
   * Create a temporary script file for Playwright automation
   * @param scriptContent JavaScript content for the script
   * @returns Path to the temporary script file
   */
  private async createTempScript(scriptContent: string): Promise<string> {
    const filename = `playwright_script_${Date.now()}.js`
    const scriptPath = await runtime.writeTempFile(filename, scriptContent)
    return scriptPath
  }

  /**
   * Format search results into a readable string
   * @param results Array of search result objects
   * @returns Formatted string
   */
  private formatSearchResults(
    results: Array<{ title: string; snippet: string }>
  ): string {
    if (!results || results.length === 0) {
      return "I couldn't find any relevant information."
    }

    let formattedResults = "Here's what I found:\n\n"

    results.forEach((result, index) => {
      formattedResults += `${index + 1}. ${result.title}\n${result.snippet}\n\n`
    })

    return formattedResults
  }

  /**
   * Check if Playwright automation is available
   */
  public isAvailable(): boolean {
    return this.initialized
  }
}
