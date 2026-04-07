import type { SliderRecord, SliderRepository } from "../../ports/slider-repository";
import { SliderError } from "./slider-errors";

export interface GetSliderInput {
  sliderId: string;
}

export interface GetSliderUseCase {
  execute(input: GetSliderInput): Promise<SliderRecord>;
}

export class GetSlider implements GetSliderUseCase {
  constructor(private readonly sliderRepository: SliderRepository) {}

  async execute(input: GetSliderInput): Promise<SliderRecord> {
    const slider = await this.sliderRepository.findById(input.sliderId);

    if (!slider) {
      throw new SliderError("Slider not found.", 404);
    }

    return slider;
  }
}
