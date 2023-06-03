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
  width: number = 1280,
  height: number = 2000
): Promise<{ thumbnailBuffer: Buffer; bodyText: string }> => {
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

    const bodyText = await page.evaluate(() => {
      return document.querySelector("body").innerText;
    });

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
    return { thumbnailBuffer: screenshotBuffer, bodyText };
  } catch (e) {
    console.log("error", e);
  }
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
  const thumbnails = await Promise.all(
    images.map((x) =>
      sharp(x.buffer)
        .resize(width, height, {
          fit: "contain",
        })
        .png()
        .toBuffer()
    )
  );
  return thumbnails.map((x, index) => {
    return {
      name: images[index].name?.split(".")[0] + ".png",
      thumbnailBuffer: x,
    };
  });
};

export const _generateThumbnailFromImageBuffers = async (
  images: { name: string; buffer: Buffer }[],
  width: number = 200,
  height: number = 200
): Promise<
  {
    name: string;
    thumbnailBuffer: Buffer;
  }[]
> => {
  const browser = await launch();
  const pages = await Promise.all(images.map(() => browser.newPage()));

  const thumbnailPromises = images.map(async (image, index) => {
    const page = pages[index];
    await page.goto("data:text/html;charset=UTF-8,");

    const imageBase64 = image.buffer.toString("base64");
    await page.evaluate((base64) => {
      const img = document.createElement("img");
      img.src = "data:image/png;base64," + base64;
      // img.style.width = "200px";
      // img.style.height = "200px";
      // img.style.objectFit = "contain";
      document.body.appendChild(img);
    }, imageBase64);

    await page.waitForSelector("img");
    const thumbnailBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "binary",
      omitBackground: true,
      captureBeyondViewport: false,
    });
    // Do something with the thumbnailBuffer

    return thumbnailBuffer;
  });

  const thumbnails = await Promise.all(thumbnailPromises);

  await Promise.all(pages.map((page) => page.close()));
  await browser.close();

  return thumbnails.map((x, index) => {
    return {
      name: images[index].name?.split(".")[0] + ".png",
      thumbnailBuffer: x,
    };
  });
};
