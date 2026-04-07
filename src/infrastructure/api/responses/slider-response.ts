import type { SliderRecord } from "../../../ports/slider-repository";
import { buildSliderImagePublicUrl } from "../../storage/build-public-storage-url";

export function toSliderResponse(slider: SliderRecord) {
  return {
    id: slider.id,
    title: slider.title,
    description: slider.description,
    subtitle: slider.subtitle,
    button_label: slider.buttonLabel,
    background_color: slider.backgroundColor,
    is_light: slider.isLight,
    display_order: slider.displayOrder,
    status: slider.status,
    image: {
      storage_path: slider.image.storagePath,
      public_url: buildSliderImagePublicUrl(slider.image.storagePath),
      mime_type: slider.image.mimeType,
      original_file_name: slider.image.originalFileName
    },
    created_at: slider.createdAt.toISOString(),
    updated_at: slider.updatedAt.toISOString()
  };
}
