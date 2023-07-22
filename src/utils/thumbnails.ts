import { launch, executablePath, Browser } from "puppeteer";
import * as chromium from "@sparticuz/chromium";
import sharp from "sharp";

let browser: Browser = null;

/**
 * @param html
 * @param width
 * @param height
 * @returns
 */
export const generateThumbnailFromHtml = async (
  html: string,
  width: number = 600,
  height: number = 800
): Promise<Buffer> => {
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
    await page.setViewport({ width, height });

    // Navigate to the HTML content
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Take a screenshot of the page and return it as a Buffer
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "binary",
    });

    const screenShot = await sharp(screenshotBuffer)
      .resize({
        height: 1000,
      })
      .png()
      .toBuffer();
    console.log("screenshotBuffer generated");
    const pages = await browser.pages();
    console.log("opened pages", pages.length);
    for (let i = 0; i < pages.length; i++) {
      await pages[i].close();
    }
    console.log("closing browser");
    await browser.close();
    console.log("browser closed");
    return screenShot;
  } catch (e) {
    console.log("error", e);
  }
  return null;
};

export const generateThumbnailFromImageBuffers = async (
  images: { name: string; buffer: Buffer }[],
  width: number = 200,
  height: number = 200
): Promise<
  {
    name: string;
    thumbnailBuffer: Buffer;
  }[]
> => {
  return images.map((x) => {
    return {
      name: x.name,
      thumbnailBuffer: x.buffer,
    };
  });
  // const thumbnails = await Promise.all(
  //   images.map((x) =>
  //     sharp(x.buffer)
  //       .resize(width, height, {
  //         fit: "contain",
  //       })
  //       .png()
  //       .toBuffer()
  //   )
  // );
  // return thumbnails.map((x, index) => {
  //   return {
  //     name: images[index].name?.split(".")[0] + ".png",
  //     thumbnailBuffer: x,
  //   };
  // });
};
