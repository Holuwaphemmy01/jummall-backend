export interface SliderImageRecord {
  storagePath: string;
  mimeType: string;
  originalFileName: string;
}

export type SliderStatus = "active" | "inactive";

export interface SliderRecord {
  id: string;
  title: string;
  description: string;
  subtitle: string;
  buttonLabel: string;
  backgroundColor: string;
  isLight: boolean;
  displayOrder: number;
  status: SliderStatus;
  image: SliderImageRecord;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSliderInput {
  title: string;
  description: string;
  subtitle: string;
  buttonLabel: string;
  backgroundColor: string;
  isLight: boolean;
  displayOrder: number;
  status?: SliderStatus;
  image: SliderImageRecord;
}

export interface UpdateSliderInput {
  sliderId: string;
  title?: string;
  description?: string;
  subtitle?: string;
  buttonLabel?: string;
  backgroundColor?: string;
  isLight?: boolean;
  displayOrder?: number;
  image?: SliderImageRecord;
}

export interface UpdateSliderStatusInput {
  sliderId: string;
  status: SliderStatus;
}

export interface SliderRepository {
  create(input: CreateSliderInput): Promise<SliderRecord>;
  findAll(): Promise<SliderRecord[]>;
  findActive(): Promise<SliderRecord[]>;
  findById(sliderId: string): Promise<SliderRecord | null>;
  update(input: UpdateSliderInput): Promise<SliderRecord | null>;
  updateStatus(input: UpdateSliderStatusInput): Promise<SliderRecord | null>;
}
