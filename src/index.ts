import express from 'express';
import dotenv from 'dotenv';
import { pdfUrls } from './pdf-urls.js';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { pdfToText } from 'pdf-ts';
import PQueue from 'p-queue';
import pRetry, { AbortError } from 'p-retry';
import { Browser } from 'puppeteer';
dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();
const puppeteer = puppeteerExtra.default;
puppeteer.use(StealthPlugin());
let browser: Browser | null = null;

const initBrowser = async () => {
  if (browser) {
    await browser.close();
  }
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
  });
};

const queue = new PQueue({
  concurrency: parseInt(process.env.CONCURRENCY || '1'),
});

app.get('/', async (req, res) => {
  const pdfUrl = req.query['url'] as string;
  if (!pdfUrl) {
    return res.status(400).json({
      status: 'failed',
      message: "Please provide 'pdfUrl' as url parameter.",
    });
  }

  try {
    const pdfText = await queue.add(() =>
      pRetry(() => getPdfText(pdfUrl), {
        onFailedAttempt: (error) => {
          console.warn(
            `Download attempt failed (${error.attemptNumber}/5): ${pdfUrl}`
          );
        },
        retries: 5,
      })
    );
    return res.json({
      status: 'success',
      text: pdfText,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      status: 'failed',
      message: 'Unexpected error',
      error,
    });
  }
});

const getPdfText = async (pdfUrl: string) => {
  if (!browser || !browser.isConnected()) {
    await initBrowser();
  }

  const page = await browser!.newPage();
  try {
    console.log('Loading PDF: ', pdfUrl);
    await page.goto(pdfUrl);
    const pdfBinaryString = await page.evaluate(async (url) => {
      var response = await fetch(url, { method: 'GET', credentials: 'include' });
      if (response.status !== 200) {
        throw new AbortError(
          `Failed to download (${response.statusText}): ${pdfUrl}`
        );
      }
      var blob = await response.blob();
      var result = new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsBinaryString(blob);
      });
      return result;
    }, pdfUrl);

    console.log('Successfully downloaded PDF: ', pdfUrl);
    //@ts-ignore
    return await pdfToText(Buffer.from(pdfBinaryString, 'binary'));
  } catch (error) {
    console.error(`Error processing PDF: ${pdfUrl}`, error);
    throw error;
  } finally {
    await page.close();
  }
};

// Initialize the browser when the server starts
initBrowser().then(() => {
  app
    .listen(PORT, () => {
      console.log('Server listening on PORT ', PORT);
    })
    .on('error', console.log);
});