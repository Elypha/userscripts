import { GM } from "$";

export async function copyImageToClipboard(url: string): Promise<void> {
  const pngBlob = fetchImage(url).then(convertToPng);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
}

async function fetchImage(url: string): Promise<Blob> {
  const response = await GM.xmlHttpRequest({
    method: "GET",
    url,
    responseType: "blob",
    anonymous: true,
  });

  if (response.status < 200 || response.status >= 300 || !(response.response instanceof Blob)) {
    throw new Error(`Image request failed with status ${response.status}.`);
  }

  return response.response;
}

async function convertToPng(imageBlob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(imageBlob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Canvas is unavailable.");
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!pngBlob) throw new Error("Unable to convert the image to PNG.");

  return pngBlob;
}
