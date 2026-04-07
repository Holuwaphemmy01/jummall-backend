import type { DocumentStorage } from "../../ports/document-storage";
import type { SliderRecord, SliderRepository } from "../../ports/slider-repository";
import { SliderError } from "./slider-errors";
import {
  type SliderImageUploadInput,
  validateSliderImage
} from "./slider-image";

export interface UpdateSliderInput {
  sliderId: string;
  title?: string;
  description?: string;
  subtitle?: string;
  buttonLabel?: string;
  backgroundColor?: string;
  isLight?: boolean;
  displayOrder?: number;
  image?: SliderImageUploadInput;
}

export interface UpdateSliderUseCase {
  execute(input: UpdateSliderInput): Promise<SliderRecord>;
}

export class UpdateSlider implements UpdateSliderUseCase {
  constructor(
    private readonly sliderRepository: SliderRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(input: UpdateSliderInput): Promise<SliderRecord> {
    const existingSlider = await this.sliderRepository.findById(input.sliderId);

    if (!existingSlider) {
      throw new SliderError("Slider not found.", 404);
    }

    let uploadedImage:
      | {
          storagePath: string;
          mimeType: string;
          originalFileName: string;
        }
      | undefined;

    if (input.image) {
      validateSliderImage(input.image);

      try {
        const imageUpload = await this.documentStorage.uploadSliderImage({
          sliderTitle: input.title ?? existingSlider.title,
          fileName: input.image.fileName,
          mimeType: input.image.mimeType,
          fileContents: input.image.fileContents
        });

        uploadedImage = {
          storagePath: imageUpload.storagePath,
          mimeType: input.image.mimeType,
          originalFileName: input.image.fileName
        };
      } catch {
        throw new SliderError(
          "Unable to upload slider image. Check that the slider image bucket exists and storage is configured correctly.",
          500,
          "image"
        );
      }
    }

    const updatedSlider = await this.sliderRepository.update({
      sliderId: input.sliderId,
      title: input.title,
      description: input.description,
      subtitle: input.subtitle,
      buttonLabel: input.buttonLabel,
      backgroundColor: input.backgroundColor,
      isLight: input.isLight,
      displayOrder: input.displayOrder,
      image: uploadedImage
    });

    if (!updatedSlider) {
      throw new SliderError("Slider not found.", 404);
    }

    return updatedSlider;
  }
}
