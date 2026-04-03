export interface DiscountProrationLineInput {
  id: string;
  rawSubtotal: number;
}

export interface DiscountProrationLineResult<
  TLine extends DiscountProrationLineInput
> {
  line: TLine;
  discountAllocated: number;
  discountedSubtotal: number;
}

export function prorateDiscountAcrossLines<
  TLine extends DiscountProrationLineInput
>(
  lines: TLine[],
  discountedSubtotal: number
): {
  rawSubtotal: number;
  totalDiscount: number;
  lines: Array<DiscountProrationLineResult<TLine>>;
} {
  const rawSubtotal = lines.reduce((sum, line) => sum + line.rawSubtotal, 0);
  const totalDiscount = rawSubtotal - discountedSubtotal;

  if (lines.length === 0 || totalDiscount === 0) {
    return {
      rawSubtotal,
      totalDiscount,
      lines: lines.map((line) => ({
        line,
        discountAllocated: 0,
        discountedSubtotal: line.rawSubtotal
      }))
    };
  }

  if (rawSubtotal === 0) {
    return {
      rawSubtotal,
      totalDiscount,
      lines: lines.map((line) => ({
        line,
        discountAllocated: 0,
        discountedSubtotal: 0
      }))
    };
  }

  const provisionalDiscounts = lines.map((line) => {
    const rawDiscount = (line.rawSubtotal * totalDiscount) / rawSubtotal;
    const flooredDiscount = Math.floor(rawDiscount);

    return {
      line,
      flooredDiscount,
      fractionalRemainder: rawDiscount - flooredDiscount
    };
  });

  const allocatedDiscount = provisionalDiscounts.reduce(
    (sum, line) => sum + line.flooredDiscount,
    0
  );

  let remainingDiscountUnits = Math.round(totalDiscount - allocatedDiscount);

  provisionalDiscounts.sort((left, right) => {
    if (right.fractionalRemainder !== left.fractionalRemainder) {
      return right.fractionalRemainder - left.fractionalRemainder;
    }

    return left.line.id.localeCompare(right.line.id);
  });

  const discountByLineId = new Map<string, number>();

  for (const provisionalDiscount of provisionalDiscounts) {
    let discountAllocated = provisionalDiscount.flooredDiscount;

    if (remainingDiscountUnits > 0) {
      discountAllocated += 1;
      remainingDiscountUnits -= 1;
    }

    discountByLineId.set(provisionalDiscount.line.id, discountAllocated);
  }

  return {
    rawSubtotal,
    totalDiscount,
    lines: lines.map((line) => {
      const discountAllocated = discountByLineId.get(line.id) ?? 0;

      return {
        line,
        discountAllocated,
        discountedSubtotal: line.rawSubtotal - discountAllocated
      };
    })
  };
}
