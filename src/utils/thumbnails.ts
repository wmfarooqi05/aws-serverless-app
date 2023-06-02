import { launch, executablePath, Browser } from "puppeteer";
import * as chromium from "@sparticuz/chromium";

export const generateThumbnailFromBuffer = () => {};
let browser: Browser = null;

/**
 * @param html
 * @param width
 * @param height
 * @returns
 */
export const generateThumbnailFromHtml = async (
  html: string,
  width: number = 1280,
  height: number = 2000
): Promise<Buffer> => {
  try {
    console.log(process.env.STAGE);
    const execPath =
      process.env.STAGE === "local"
        ? executablePath()
        : await chromium.executablePath();

    console.log("execPath", execPath);
    browser = await launch({
      args: chromium.args,
      userDataDir: "/tmp",
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    console.log("browser", browser);
    const page = await browser.newPage();
    console.log("page", page);

    // Set the viewport size
    await page.setViewport({ width, height });

    // Navigate to the HTML content
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Take a screenshot of the page and return it as a Buffer
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "binary",
    });
    console.log("screenshotBuffer generated");
    const pages = await browser.pages();
    console.log("opened pages", pages.length);
    for (let i = 0; i < pages.length; i++) {
      await pages[i].close();
    }
    console.log("closing browser");
    await browser.close();
    console.log("browser closed");
    return screenshotBuffer;
  } catch (e) {
    console.log("error", e);
  }
};
