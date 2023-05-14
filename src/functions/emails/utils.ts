import { launch } from "puppeteer";

export const generateThumbnailFromBuffer = () => {};

export const generateThumbnailFromHtml = async (
  html: string,
  width: number = 800,
  height: number = 600
): Promise<Buffer> => {
  const browser = await launch();
  const page = await browser.newPage();

  // Set the viewport size
  await page.setViewport({ width, height });

  // Navigate to the HTML content
  await page.setContent(html, { waitUntil: "networkidle0" });

  // Take a screenshot of the page and return it as a Buffer
  const screenshotBuffer = await page.screenshot({ type: "png" });

  // Close the browser
  await browser.close();

  return screenshotBuffer;
};
