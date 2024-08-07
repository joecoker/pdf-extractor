import express from "express";
import dotenv from "dotenv"
import fs from "fs/promises"
import { getBillText } from "./utils/getBillText.js";
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
}// const pdfBuffer = await getPdfBuffer(pdfUrl, pdfDownloadDir)


app.get("/", async (req, res) => {
    const pdfUrl = req.query.pdfUrl as string
    if (!pdfUrl) {
        return res.status(400).json({
            status: "failed",
            message: "Please provide 'pdfUrl' as url parameter."
        })
    }

    try {
        const pdfText = await getBillText(pdfUrl, pdfDownloadDir)
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


app.listen(PORT, () => {
    console.log("Server listining to PORT ", PORT);
}).on("error", console.log)