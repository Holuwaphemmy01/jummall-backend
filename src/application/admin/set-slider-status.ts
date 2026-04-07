import type {
  SliderRecord,
  SliderRepository,
  SliderStatus
} from "../../ports/slider-repository";
import { SliderError } from "./slider-errors";

export interface SetSliderStatusInput {
  sliderId: string;
  status: SliderStatus;
}

export interface SetSliderStatusUseCase {
  execute(input: SetSliderStatusInput): Promise<SliderRecord>;
}

export class SetSliderStatus implements SetSliderStatusUseCase {
  constructor(private readonly sliderRepository: SliderRepository) {}

  async execute(input: SetSliderStatusInput): Promise<SliderRecord> {
    const existingSlider = await this.sliderRepository.findById(input.sliderId);

    if (!existingSlider) {
      throw new SliderError("Slider not found.", 404);
    }

    const updatedSlider = await this.sliderRepository.updateStatus(input);

    if (!updatedSlider) {
      throw new SliderError("Slider not found.", 404);
    }

    return updatedSlider;
  }
}
