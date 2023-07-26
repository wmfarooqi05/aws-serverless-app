import { launch, executablePath, Browser } from "puppeteer";
import * as chromium from "@sparticuz/chromium";
import sharp from "sharp";
import { isValidJSON } from "./json";

let browser: Browser = null;

/**
 * @param html
 * @param width
 * @param height
 * @returns
 */
export const generateThumbnailFromHtml = async (
  html: string
): Promise<{
  htmlImageBuffer: Buffer | null;
  pageSize: { width: number; height: number };
}> => {
  try {
    console.log(process.env.STAGE);
    const execPath =
      process.env.STAGE === "local"
        ? executablePath()
        : await chromium.executablePath();

    console.log("[generateThumbnailFromHtml chromium execPath", execPath);
    browser = await launch({
      args: chromium.args,
      userDataDir: "/tmp",
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();

    // Set the viewport size
    // await page.setViewport({ width, height });

    // Navigate to the HTML content
    let htmlStr = html;

    if (isValidJSON(html)) {
      htmlStr = JSON.parse(html);
    }
    await page.setContent(htmlStr, { waitUntil: "networkidle0" });

    const pageSize = await page.evaluate(() => {
      const { width, height } =
        document.documentElement.getBoundingClientRect();
      return { width: Math.floor(width), height: Math.floor(height) };
    });

    // Take a screenshot of the page and return it as a Buffer
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "binary",
    });

    const pages = await browser.pages();
    console.log("opened pages", pages.length);
    for (let i = 0; i < pages.length; i++) {
      await pages[i].close();
    }
    console.log("closing browser");
    await browser.close();
    console.log("browser closed");
    return { htmlImageBuffer: screenshotBuffer, pageSize };
  } catch (e) {
    console.log("error", e);
  }
  return null;
};

/**
 *
 * @param image
 * @param width
 * @param height
 * @returns
 */
export const imageResize = async (
  image: string | Buffer,
  width: number = 600,
  height: number = 800
): Promise<Buffer> => {
  return sharp(image)
    .resize(width, height, {
      fit: "cover",
    })
    .toBuffer();
};
