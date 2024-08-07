import { pdfToText } from 'pdf-ts';

const getPdfBuffer = async (pdfUrl: string) => {
  const pdfRes = await fetch(pdfUrl, {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,bn;q=0.7",
      "cache-control": "no-cache",
      "pragma": "no-cache",
      "priority": "u=0, i",
      "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Linux\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET"
  });
  // throw error if can't successfully download PDF
  if (pdfRes.status !== 200) {
    throw new Error(`Unable to download the PDF file. \n Server responded with  ${pdfRes.status} status code.`);
  }
  const pdfArrayBuffer = await pdfRes.arrayBuffer()
  const pdfBuffer = Buffer.from(pdfArrayBuffer)
  return pdfBuffer
}

const getPdfText = async (pdfUrl: string) => {
  try {
    const pdfBuffer = await getPdfBuffer(pdfUrl)
    let pdfText = await pdfToText(pdfBuffer)
    pdfText = pdfText.replace(/\n(?!\n)/g, ' ');
    return pdfText
  } catch (error) {
    throw error
  }
}

export { getPdfText }