import { z } from 'zod';
import { createAction } from 'nango';

const RgbColorSchema = z.object({
    red: z.number().min(0).max(1).describe('Red component, from 0.0 to 1.0.'),
    green: z.number().min(0).max(1).describe('Green component, from 0.0 to 1.0.'),
    blue: z.number().min(0).max(1).describe('Blue component, from 0.0 to 1.0.')
});

const OpaqueColorSchema = z.object({
    rgbColor: RgbColorSchema.optional().describe('An opaque RGB color. Provide this or themeColor.'),
    themeColor: z
        .enum([
            'DARK1',
            'LIGHT1',
            'DARK2',
            'LIGHT2',
            'ACCENT1',
            'ACCENT2',
            'ACCENT3',
            'ACCENT4',
            'ACCENT5',
            'ACCENT6',
            'HYPERLINK',
            'FOLLOWED_HYPERLINK',
            'TEXT1',
            'BACKGROUND1',
            'TEXT2',
            'BACKGROUND2'
        ])
        .optional()
        .describe('An opaque theme color resolved from the presentation color scheme. Provide this or rgbColor.')
});

const OptionalColorSchema = z.object({
    opaqueColor: OpaqueColorSchema.optional().describe('The opaque color to apply. Omit to make the color transparent.')
});

const LinkSchema = z.object({
    url: z.string().optional().describe('External web page URL to link to.'),
    relativeLink: z.enum(['NEXT_SLIDE', 'PREVIOUS_SLIDE', 'FIRST_SLIDE', 'LAST_SLIDE']).optional().describe('Another slide to link to by relative position.'),
    pageObjectId: z.string().optional().describe('Object ID of a page in the presentation to link to.'),
    slideIndex: z.number().int().min(0).optional().describe('Zero-based index of a slide in the presentation to link to.')
});

const WeightedFontFamilySchema = z.object({
    fontFamily: z.string().describe('Font family name, for example "Arial" or any Google Fonts family.'),
    weight: z.number().int().min(100).max(900).optional().describe('Rendered font weight as a multiple of 100 between 100 and 900. Defaults to 400.')
});

const TextStyleSchema = z.object({
    bold: z.boolean().optional().describe('Whether the text is rendered as bold.'),
    italic: z.boolean().optional().describe('Whether the text is italicized.'),
    underline: z.boolean().optional().describe('Whether the text is underlined.'),
    strikethrough: z.boolean().optional().describe('Whether the text is struck through.'),
    smallCaps: z.boolean().optional().describe('Whether the text is rendered in small capitals.'),
    baselineOffset: z.enum(['NONE', 'SUPERSCRIPT', 'SUBSCRIPT']).optional().describe('Vertical offset of the text from its normal baseline.'),
    fontSize: z
        .object({
            magnitude: z.number().positive().describe('Font size value, expressed in `unit`. Example: 18'),
            unit: z.enum(['PT', 'EMU']).describe('Unit for the magnitude: "PT" (points) or "EMU" (12700 EMU = 1 point). Example: "PT"')
        })
        .optional()
        .describe('Font size as a Slides Dimension. Example: { "magnitude": 18, "unit": "PT" }'),
    weightedFontFamily: WeightedFontFamilySchema.optional().describe('Font family together with an explicit weight.'),
    foregroundColor: OptionalColorSchema.optional().describe('Color of the text itself.'),
    backgroundColor: OptionalColorSchema.optional().describe('Background color behind the text.'),
    link: LinkSchema.optional().describe('Hyperlink destination for the text.')
});

const TextRangeInputSchema = z.object({
    type: z
        .enum(['ALL', 'FIXED_RANGE', 'FROM_START_INDEX'])
        .optional()
        .describe('Kind of range. Defaults to ALL (the whole text) when omitted, and is inferred from startIndex/endIndex when those are given.'),
    startIndex: z.number().int().min(0).optional().describe('Zero-based start offset in Unicode code units. Required for FIXED_RANGE and FROM_START_INDEX.'),
    endIndex: z.number().int().min(0).optional().describe('Zero-based exclusive end offset in Unicode code units. Required for FIXED_RANGE.')
});

const TextRangeSchema = z.object({
    type: z.enum(['ALL', 'FIXED_RANGE', 'FROM_START_INDEX']).describe('The concrete kind of range that was applied.'),
    startIndex: z.number().int().min(0).optional().describe('Zero-based start offset in Unicode code units, when applicable.'),
    endIndex: z.number().int().min(0).optional().describe('Zero-based exclusive end offset in Unicode code units, when applicable.')
});

const TableCellLocationSchema = z.object({
    rowIndex: z.number().int().min(0).describe('Zero-based row index of the cell within the table.'),
    columnIndex: z.number().int().min(0).describe('Zero-based column index of the cell within the table.')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('Object ID of the presentation to update. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI".'),
        objectId: z.string().describe('Object ID of the shape or table whose text will be styled.'),
        style: TextStyleSchema.describe('Character formatting to apply. At least one property must be set unless an explicit `fields` mask is supplied.'),
        textRange: TextRangeInputSchema.optional().describe("Range of text to style. Omit to style the shape's entire text."),
        cellLocation: TableCellLocationSchema.optional().describe('Cell to style when objectId refers to a table. Must be omitted when it does not.'),
        fields: z
            .string()
            .optional()
            .describe(
                'Comma-separated FieldMask of style properties to apply, for example "bold,italic,foregroundColor". Omit to apply exactly the style properties that are set. To reset a property to its default, name it here and leave it unset in `style`.'
            )
    })
    .describe('Character formatting to apply to a range of text in a Google Slides presentation.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('Object ID of the presentation that was updated.'),
        objectId: z.string().describe('Object ID of the shape or table whose text was styled.'),
        fields: z.string().describe('The FieldMask of style properties that was applied.'),
        textRange: TextRangeSchema.describe('The text range that was styled, normalized to a concrete range type.'),
        cellLocation: TableCellLocationSchema.optional().describe('The table cell that was styled, when the target was a table.')
    })
    .describe('Confirmation of the character formatting that was applied to the target text range.');

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string().optional(),
    replies: z.array(z.record(z.string(), z.unknown())).optional()
});

function normalizeTextRange(range: z.infer<typeof TextRangeInputSchema> | undefined): z.infer<typeof TextRangeSchema> {
    if (range === undefined) {
        return { type: 'ALL' };
    }

    let type = range.type;
    if (type === undefined) {
        if (range.startIndex !== undefined && range.endIndex !== undefined) {
            type = 'FIXED_RANGE';
        } else if (range.startIndex !== undefined) {
            type = 'FROM_START_INDEX';
        } else {
            type = 'ALL';
        }
    }

    return {
        type,
        ...(range.startIndex !== undefined && { startIndex: range.startIndex }),
        ...(range.endIndex !== undefined && { endIndex: range.endIndex })
    };
}

/**
 * @tags: [write]
 * @tagReason: Applies character formatting to a range of text in a presentation, mutating the presentation.
 * @pitfalls: The reply for this update is empty, so success means accepted, not applied; re-read to confirm. Naming a style property in `fields` but leaving it unset resets it to the inherited default. Setting `link` also overrides foreground color and underline unless those are set in the same call. Text offsets are 0-based and count the trailing newline that ends the shape's last paragraph.
 */
const action = createAction({
    description: 'Apply character formatting (bold, italic, color, font, and more) to a range of text in a presentation.',
    version: '1.0.0',
    scopes: ['https://www.googleapis.com/auth/presentations'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const stylePayload = {
            ...(input.style.bold !== undefined && { bold: input.style.bold }),
            ...(input.style.italic !== undefined && { italic: input.style.italic }),
            ...(input.style.underline !== undefined && { underline: input.style.underline }),
            ...(input.style.strikethrough !== undefined && { strikethrough: input.style.strikethrough }),
            ...(input.style.smallCaps !== undefined && { smallCaps: input.style.smallCaps }),
            ...(input.style.baselineOffset !== undefined && { baselineOffset: input.style.baselineOffset }),
            ...(input.style.fontSize !== undefined && { fontSize: { magnitude: input.style.fontSize.magnitude, unit: input.style.fontSize.unit } }),
            ...(input.style.weightedFontFamily !== undefined && { weightedFontFamily: input.style.weightedFontFamily }),
            ...(input.style.foregroundColor !== undefined && { foregroundColor: input.style.foregroundColor }),
            ...(input.style.backgroundColor !== undefined && { backgroundColor: input.style.backgroundColor }),
            ...(input.style.link !== undefined && { link: input.style.link })
        };

        const fields = input.fields !== undefined && input.fields.length > 0 ? input.fields : Object.keys(stylePayload).join(',');

        if (fields.length === 0) {
            throw new nango.ActionError({
                type: 'missing_style',
                message: 'Provide at least one property in `style` or an explicit `fields` mask.'
            });
        }

        const textRange = normalizeTextRange(input.textRange);

        const request = {
            objectId: input.objectId,
            style: stylePayload,
            textRange,
            fields,
            ...(input.cellLocation !== undefined && { cellLocation: input.cellLocation })
        };

        // https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [{ updateTextStyle: request }]
            },
            // updateTextStyle writes absolute style values, so resending the same request is idempotent.
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);

        return {
            presentationId: parsed.presentationId ?? input.presentationId,
            objectId: input.objectId,
            fields,
            textRange,
            ...(input.cellLocation !== undefined && { cellLocation: input.cellLocation })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
