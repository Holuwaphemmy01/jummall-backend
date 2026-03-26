export function parseBase64File(fileBase64: string): Buffer {
  const base64Content = fileBase64.includes(",")
    ? fileBase64.split(",")[1]
    : fileBase64;

  const trimmedContent = base64Content.trim();

  if (!trimmedContent) {
    throw new Error("File content is empty.");
  }

  const fileBuffer = Buffer.from(trimmedContent, "base64");

  if (fileBuffer.length === 0) {
    throw new Error("File content is empty.");
  }

  return fileBuffer;
}
