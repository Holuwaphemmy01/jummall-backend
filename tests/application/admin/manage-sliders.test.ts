import { describe, expect, it, jest } from "@jest/globals";

import { CreateSlider } from "../../../src/application/admin/create-slider";
import { GetSlider } from "../../../src/application/admin/get-slider";
import { ListSliders } from "../../../src/application/admin/list-sliders";
import { SetSliderStatus } from "../../../src/application/admin/set-slider-status";
import type { SliderImageUploadInput } from "../../../src/application/admin/slider-image";
import { SliderError } from "../../../src/application/admin/slider-errors";
import { UpdateSlider } from "../../../src/application/admin/update-slider";
import { ListActiveSliders } from "../../../src/application/slider/list-active-sliders";
import type {
  DocumentStorage,
  UploadProductBrandImageInput,
  UploadProductCategoryImageInput,
  UploadProductImageInput,
  UploadSellerKycDocumentInput,
  UploadSliderImageInput,
  UploadedDocument
} from "../../../src/ports/document-storage";
import type {
  CreateSliderInput,
  SliderRecord,
  SliderRepository,
  UpdateSliderInput,
  UpdateSliderStatusInput
} from "../../../src/ports/slider-repository";

function makeSlider(overrides: Partial<SliderRecord> = {}): SliderRecord {
  return {
    id: "slider-id",
    title: "Mega Sale",
    description: "Biggest deals of the week",
    subtitle: "Starting at N250,000",
    buttonLabel: "Shop Now",
    backgroundColor: "rgb(227, 237, 246)",
    isLight: true,
    displayOrder: 1,
    status: "inactive",
    image: {
      storagePath: "sliders/mega-sale/banner.jpg",
      mimeType: "image/jpeg",
      originalFileName: "banner.jpg"
    },
    createdAt: new Date("2026-04-07T00:00:00.000Z"),
    updatedAt: new Date("2026-04-07T00:00:00.000Z"),
    ...overrides
  };
}

class SliderRepositoryDouble implements SliderRepository {
  create = jest
    .fn<(input: CreateSliderInput) => Promise<SliderRecord>>()
    .mockImplementation(async (input) =>
      makeSlider({
        title: input.title,
        description: input.description,
        subtitle: input.subtitle,
        buttonLabel: input.buttonLabel,
        backgroundColor: input.backgroundColor,
        isLight: input.isLight,
        displayOrder: input.displayOrder,
        status: input.status ?? "inactive",
        image: input.image
      })
    );

  findAll = jest.fn<() => Promise<SliderRecord[]>>().mockResolvedValue([]);

  findActive = jest.fn<() => Promise<SliderRecord[]>>().mockResolvedValue([]);

  findById = jest
    .fn<(sliderId: string) => Promise<SliderRecord | null>>()
    .mockResolvedValue(makeSlider());

  update = jest
    .fn<(input: UpdateSliderInput) => Promise<SliderRecord | null>>()
    .mockImplementation(async (input) =>
      makeSlider({
        title: input.title ?? "Mega Sale",
        description: input.description ?? "Biggest deals of the week",
        subtitle: input.subtitle ?? "Starting at N250,000",
        buttonLabel: input.buttonLabel ?? "Shop Now",
        backgroundColor: input.backgroundColor ?? "rgb(227, 237, 246)",
        isLight: input.isLight ?? true,
        displayOrder: input.displayOrder ?? 1,
        image: input.image ?? makeSlider().image
      })
    );

  updateStatus = jest
    .fn<(input: UpdateSliderStatusInput) => Promise<SliderRecord | null>>()
    .mockImplementation(async (input) =>
      makeSlider({
        status: input.status
      })
    );
}

class DocumentStorageDouble implements DocumentStorage {
  uploadSellerKycDocument = jest
    .fn<(input: UploadSellerKycDocumentInput) => Promise<UploadedDocument>>();

  uploadProductImage = jest
    .fn<(input: UploadProductImageInput) => Promise<UploadedDocument>>();

  uploadProductCategoryImage = jest
    .fn<(input: UploadProductCategoryImageInput) => Promise<UploadedDocument>>();

  uploadProductBrandImage = jest
    .fn<(input: UploadProductBrandImageInput) => Promise<UploadedDocument>>();

  uploadSliderImage = jest
    .fn<(input: UploadSliderImageInput) => Promise<UploadedDocument>>()
    .mockImplementation(async (input) => ({
      storagePath: `sliders/${input.sliderTitle.toLowerCase().replace(/\s+/g, "-")}/${input.fileName}`
    }));
}

function makeImageInput(
  overrides: Partial<SliderImageUploadInput> = {}
): SliderImageUploadInput {
  return {
    fileName: "banner.jpg",
    mimeType: "image/jpeg",
    fileContents: Buffer.from("image"),
    ...overrides
  };
}

describe("slider management", () => {
  it("creates a slider with an uploaded image and inactive default status", async () => {
    const sliderRepository = new SliderRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const createSlider = new CreateSlider(sliderRepository, documentStorage);

    const result = await createSlider.execute({
      title: "Mega Sale",
      description: "Biggest deals of the week",
      subtitle: "Starting at N250,000",
      buttonLabel: "Shop Now",
      backgroundColor: "rgb(227, 237, 246)",
      isLight: true,
      displayOrder: 1,
      image: makeImageInput()
    });

    expect(documentStorage.uploadSliderImage).toHaveBeenCalledWith({
      sliderTitle: "Mega Sale",
      fileName: "banner.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("image")
    });
    expect(sliderRepository.create).toHaveBeenCalledWith({
      title: "Mega Sale",
      description: "Biggest deals of the week",
      subtitle: "Starting at N250,000",
      buttonLabel: "Shop Now",
      backgroundColor: "rgb(227, 237, 246)",
      isLight: true,
      displayOrder: 1,
      status: "inactive",
      image: {
        storagePath: "sliders/mega-sale/banner.jpg",
        mimeType: "image/jpeg",
        originalFileName: "banner.jpg"
      }
    });
    expect(result.status).toBe("inactive");
  });

  it("rejects unsupported slider image mime types", async () => {
    const sliderRepository = new SliderRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const createSlider = new CreateSlider(sliderRepository, documentStorage);

    await expect(
      createSlider.execute({
        title: "Mega Sale",
        description: "Biggest deals of the week",
        subtitle: "Starting at N250,000",
        buttonLabel: "Shop Now",
        backgroundColor: "rgb(227, 237, 246)",
        isLight: true,
        displayOrder: 1,
        image: makeImageInput({
          mimeType: "image/gif"
        })
      })
    ).rejects.toMatchObject({
      name: "SliderError",
      statusCode: 400,
      field: "image.mime_type"
    });
    expect(documentStorage.uploadSliderImage).not.toHaveBeenCalled();
  });

  it("updates slider metadata and uploads a replacement image when provided", async () => {
    const sliderRepository = new SliderRepositoryDouble();
    const documentStorage = new DocumentStorageDouble();
    const updateSlider = new UpdateSlider(sliderRepository, documentStorage);

    const result = await updateSlider.execute({
      sliderId: "slider-id",
      title: "Weekend Sale",
      subtitle: "Fresh arrivals this weekend",
      buttonLabel: "Explore Deals",
      backgroundColor: "rgb(17, 80, 97)",
      isLight: false,
      displayOrder: 2,
      image: makeImageInput({
        fileName: "weekend.jpg",
        mimeType: "image/png"
      })
    });

    expect(documentStorage.uploadSliderImage).toHaveBeenCalledWith({
      sliderTitle: "Weekend Sale",
      fileName: "weekend.jpg",
      mimeType: "image/png",
      fileContents: Buffer.from("image")
    });
    expect(result.displayOrder).toBe(2);
    expect(result.subtitle).toBe("Fresh arrivals this weekend");
    expect(result.buttonLabel).toBe("Explore Deals");
    expect(result.backgroundColor).toBe("rgb(17, 80, 97)");
    expect(result.isLight).toBe(false);
    expect(result.image.storagePath).toBe("sliders/weekend-sale/weekend.jpg");
  });

  it("lists all sliders, gets one slider, and lists active sliders", async () => {
    const sliderRepository = new SliderRepositoryDouble();
    sliderRepository.findAll.mockResolvedValue([makeSlider()]);
    sliderRepository.findActive.mockResolvedValue([
      makeSlider({
        status: "active"
      })
    ]);

    const listSliders = new ListSliders(sliderRepository);
    const getSlider = new GetSlider(sliderRepository);
    const listActiveSliders = new ListActiveSliders(sliderRepository);

    await expect(listSliders.execute()).resolves.toHaveLength(1);
    await expect(getSlider.execute({ sliderId: "slider-id" })).resolves.toMatchObject({
      id: "slider-id"
    });
    await expect(listActiveSliders.execute()).resolves.toEqual([
      expect.objectContaining({
        status: "active"
      })
    ]);
  });

  it("activates and deactivates sliders through the status use case", async () => {
    const sliderRepository = new SliderRepositoryDouble();
    const setSliderStatus = new SetSliderStatus(sliderRepository);

    const activated = await setSliderStatus.execute({
      sliderId: "slider-id",
      status: "active"
    });
    const deactivated = await setSliderStatus.execute({
      sliderId: "slider-id",
      status: "inactive"
    });

    expect(activated.status).toBe("active");
    expect(deactivated.status).toBe("inactive");
    expect(sliderRepository.updateStatus).toHaveBeenNthCalledWith(1, {
      sliderId: "slider-id",
      status: "active"
    });
  });

  it("throws when fetching a slider that does not exist", async () => {
    const sliderRepository = new SliderRepositoryDouble();
    sliderRepository.findById.mockResolvedValue(null);
    const getSlider = new GetSlider(sliderRepository);

    await expect(
      getSlider.execute({
        sliderId: "missing-slider-id"
      })
    ).rejects.toBeInstanceOf(SliderError);
  });
});
