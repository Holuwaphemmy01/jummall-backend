import type { SliderRecord, SliderRepository } from "../../ports/slider-repository";

export interface ListSlidersUseCase {
  execute(): Promise<SliderRecord[]>;
}

export class ListSliders implements ListSlidersUseCase {
  constructor(private readonly sliderRepository: SliderRepository) {}

  async execute(): Promise<SliderRecord[]> {
    return this.sliderRepository.findAll();
  }
}
