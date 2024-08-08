import express from "express";
import dotenv from "dotenv"
import { pdfUrls } from "./pdf-urls.js";
import puppeteerExtra from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { pdfToText } from "pdf-ts";
import PQueue from 'p-queue';
dotenv.config()

const PORT = process.env.PORT || 3000
const app = express()
const puppeteer = puppeteerExtra.default
puppeteer.use(StealthPlugin())
const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
})
const queue = new PQueue({concurrency: parseInt(process.env.CONCURRENCY || "1")});

app.get("/", async (req, res) => {
    const pdfUrl = req.query["url"] as string
    if (!pdfUrl) {
        return res.status(400).json({
            status: "failed",
            message: "Please provide 'pdfUrl' as url parameter."
        })
    }

    try {
        const pdfText = await queue.add(() => getPdfText(pdfUrl))
        return res.json({
            status: "success",
            text: pdfText
        })
    } catch (error) {
        console.log(error);
        return res.status(400).json({
            status: "failed",
            message: "Unexpected error",
            error
        })
    }
})

app.get("/get-all", async (req, res) => {
    const getPdfsTextPromise = pdfUrls.map(pdfUrl => queue.add(() => getPdfText(pdfUrl)))
    try {
        const allPdfResult = await Promise.allSettled(getPdfsTextPromise)
        let successCount = 0
        const data = allPdfResult.map((result, index) => {
            if (result.status === "fulfilled") successCount++
            return {
                url: pdfUrls[index],
                status: result.status === "fulfilled" ? "success" : "failed",
                //@ts-ignore
                text: result.value
            }
        })
        return res.json({
            status: "success",
            pdfCount: allPdfResult.length,
            successCount,
            text: data
        })
    } catch (error) {
        console.log(error);
        return res.status(400).json({
            status: "failed",
            message: "Unexpected error",
            error
        })
    }
})

const getPdfText = async (pdfUrl: string) => {
    const page = await browser.newPage()
    console.log("Loading PDF: ", pdfUrl);
    await page.goto(pdfUrl)
    const pdfBinaryString = await page.evaluate(async (url) => {
        var response = await fetch(url, { method: 'GET', credentials: 'include' });
        var blob = await response.blob();
        var result = new Promise((resolve, reject) => {
            var reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsBinaryString(blob);
        });
        return result;
    }, pdfUrl);

    console.log("Successfully downloaded PDF: ", pdfUrl);
    await page.close()
    //@ts-ignore
    return await pdfToText(Buffer.from(pdfBinaryString, "binary"))
};


app.listen(PORT, () => {
    console.log("Server listining to PORT ", PORT);
}).on("error", console.log)