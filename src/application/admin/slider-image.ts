import { SliderError } from "./slider-errors";

export interface SliderImageUploadInput {
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

const ALLOWED_SLIDER_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export function validateSliderImage(image: SliderImageUploadInput) {
  if (!ALLOWED_SLIDER_IMAGE_MIME_TYPES.has(image.mimeType)) {
    throw new SliderError("Unsupported slider image type.", 400, "image.mime_type");
  }
}
