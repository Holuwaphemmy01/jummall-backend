import type { DocumentStorage } from "../../ports/document-storage";
import type { SliderRecord, SliderRepository } from "../../ports/slider-repository";
import { SliderError } from "./slider-errors";
import {
  type SliderImageUploadInput,
  validateSliderImage
} from "./slider-image";

export interface CreateSliderInput {
  title: string;
  description: string;
  subtitle: string;
  buttonLabel: string;
  backgroundColor: string;
  isLight: boolean;
  displayOrder: number;
  image: SliderImageUploadInput;
}

export interface CreateSliderUseCase {
  execute(input: CreateSliderInput): Promise<SliderRecord>;
}

export class CreateSlider implements CreateSliderUseCase {
  constructor(
    private readonly sliderRepository: SliderRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(input: CreateSliderInput): Promise<SliderRecord> {
    validateSliderImage(input.image);

    let uploadedImage;

    try {
      uploadedImage = await this.documentStorage.uploadSliderImage({
        sliderTitle: input.title,
        fileName: input.image.fileName,
        mimeType: input.image.mimeType,
        fileContents: input.image.fileContents
      });
    } catch {
      throw new SliderError(
        "Unable to upload slider image. Check that the slider image bucket exists and storage is configured correctly.",
        500,
        "image"
      );
    }

    return this.sliderRepository.create({
      title: input.title,
      description: input.description,
      subtitle: input.subtitle,
      buttonLabel: input.buttonLabel,
      backgroundColor: input.backgroundColor,
      isLight: input.isLight,
      displayOrder: input.displayOrder,
      status: "inactive",
      image: {
        storagePath: uploadedImage.storagePath,
        mimeType: input.image.mimeType,
        originalFileName: input.image.fileName
      }
    });
  }
}
