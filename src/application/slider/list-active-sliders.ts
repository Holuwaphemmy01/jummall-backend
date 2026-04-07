import type { SliderRecord, SliderRepository } from "../../ports/slider-repository";

export interface ListActiveSlidersUseCase {
  execute(): Promise<SliderRecord[]>;
}

export class ListActiveSliders implements ListActiveSlidersUseCase {
  constructor(private readonly sliderRepository: SliderRepository) {}

  async execute(): Promise<SliderRecord[]> {
    return this.sliderRepository.findActive();
  }
}
