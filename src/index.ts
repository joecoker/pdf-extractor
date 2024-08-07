import express from "express";
import dotenv from "dotenv"
import fs from "fs/promises"
import { getPdfText } from "./utils/getPdfText.js";
import { pdfUrls } from "./pdf-urls.js";
const app = express()

dotenv.config()

const pdfDownloadDir = process.env.DOWNLOAD_DIR || "./pdfs"
const PORT = process.env.PORT || 3000

const fileExists = async (filePath: string) => {
    try {
        await fs.access(filePath);
        return true;
    } catch (err) {
        return false;
    }
}

// creating PDF download directory if exist
if (!(await fileExists(pdfDownloadDir))) {
    await fs.mkdir(pdfDownloadDir);
}

app.get("/", async (req, res) => {
    const pdfUrl = req.query["url"] as string
    if (!pdfUrl) {
        return res.status(400).json({
            status: "failed",
            message: "Please provide 'pdfUrl' as url parameter."
        })
    }

    try {
        const pdfText = await getPdfText(pdfUrl)
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
    const getPdfsTextPromise = pdfUrls.map(pdfUrl => getPdfText(pdfUrl))
    try {
        const allPdfResult = await Promise.allSettled(getPdfsTextPromise)
        let successCount = 0
        const data = allPdfResult.map((result, index) => {
            if(result.status === "fulfilled") successCount++
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


app.listen(PORT, () => {
    console.log("Server listining to PORT ", PORT);
}).on("error", console.log)