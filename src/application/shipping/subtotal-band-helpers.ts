import type {
  ShippingMethodType,
  ShippingSubtotalBandInput
} from "../../ports/shipping/shipping-models";

export interface RawShippingSubtotalBandInput {
  minSubtotal: number;
  maxSubtotal?: number | null;
  methodType: ShippingMethodType;
  value: number;
}

export interface ShippingSubtotalBandValidationIssue {
  field: string;
  message: string;
}

interface IndexedBand extends ShippingSubtotalBandInput {
  originalIndex: number;
}

export function normalizeAndValidateSubtotalBands(
  subtotalBands: RawShippingSubtotalBandInput[] | undefined
): {
  subtotalBands: ShippingSubtotalBandInput[] | undefined;
  issue?: ShippingSubtotalBandValidationIssue;
} {
  if (subtotalBands === undefined) {
    return { subtotalBands: undefined };
  }

  const indexedBands: IndexedBand[] = subtotalBands.map((band, index) => ({
    originalIndex: index,
    minSubtotal: band.minSubtotal,
    maxSubtotal: band.maxSubtotal ?? null,
    methodType: band.methodType,
    value: band.value
  }));

  for (const band of indexedBands) {
    if (band.maxSubtotal !== null && band.maxSubtotal <= band.minSubtotal) {
      return {
        subtotalBands: undefined,
        issue: {
          field: `subtotal_bands.${band.originalIndex}.max_subtotal`,
          message: "Max subtotal must be greater than min subtotal."
        }
      };
    }

    if (band.methodType === "percentage_based" && band.value > 100) {
      return {
        subtotalBands: undefined,
        issue: {
          field: `subtotal_bands.${band.originalIndex}.value`,
          message: "Percentage-based shipping values cannot exceed 100."
        }
      };
    }
  }

  const sortedBands = [...indexedBands].sort((left, right) => {
    if (left.minSubtotal === right.minSubtotal) {
      return left.originalIndex - right.originalIndex;
    }

    return left.minSubtotal - right.minSubtotal;
  });

  for (let index = 0; index < sortedBands.length; index += 1) {
    const currentBand = sortedBands[index];
    const nextBand = sortedBands[index + 1];

    if (currentBand.maxSubtotal === null && nextBand) {
      return {
        subtotalBands: undefined,
        issue: {
          field: `subtotal_bands.${currentBand.originalIndex}.max_subtotal`,
          message: "An open-ended subtotal band must be the last band."
        }
      };
    }

    if (nextBand && currentBand.maxSubtotal !== null) {
      if (currentBand.maxSubtotal > nextBand.minSubtotal) {
        return {
          subtotalBands: undefined,
          issue: {
            field: `subtotal_bands.${nextBand.originalIndex}.min_subtotal`,
            message: "Subtotal bands must not overlap."
          }
        };
      }
    }
  }

  return {
    subtotalBands: sortedBands.map(({ originalIndex: _ignored, ...band }) => band)
  };
}
