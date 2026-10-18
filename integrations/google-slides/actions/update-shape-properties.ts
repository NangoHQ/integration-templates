import { z } from 'zod';
import { createAction } from 'nango';

const ThemeColorTypeSchema = z.enum([
    'THEME_COLOR_TYPE_UNSPECIFIED',
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
]);

const PropertyStateSchema = z.enum(['RENDERED', 'NOT_RENDERED', 'INHERIT']);

const DashStyleSchema = z.enum(['DASH_STYLE_UNSPECIFIED', 'SOLID', 'DOT', 'DASH', 'DASH_DOT', 'LONG_DASH', 'LONG_DASH_DOT']);

const ContentAlignmentSchema = z.enum(['CONTENT_ALIGNMENT_UNSPECIFIED', 'CONTENT_ALIGNMENT_UNSUPPORTED', 'TOP', 'MIDDLE', 'BOTTOM']);

const AutofitTypeSchema = z.enum(['AUTOFIT_TYPE_UNSPECIFIED', 'NONE']);

const UnitSchema = z.enum(['UNIT_UNSPECIFIED', 'EMU', 'PT']);

const RgbColorSchema = z.object({
    red: z.number().describe('Red component of the color, from 0.0 to 1.0. Example: 0.2.'),
    green: z.number().describe('Green component of the color, from 0.0 to 1.0. Example: 0.4.'),
    blue: z.number().describe('Blue component of the color, from 0.0 to 1.0. Example: 0.9.')
});

const OpaqueColorSchema = z.object({
    rgbColor: RgbColorSchema.optional().describe('An opaque RGB color.'),
    themeColor: ThemeColorTypeSchema.optional().describe('An opaque theme color, resolved against the presentation color scheme.')
});

const SolidFillSchema = z.object({
    color: OpaqueColorSchema.optional().describe('The color value of the solid fill.'),
    alpha: z.number().optional().describe('Fraction of the color applied to the pixel, from 0.0 (fully transparent) to 1.0 (fully opaque).')
});

const DimensionSchema = z.object({
    magnitude: z.number().describe('The magnitude of the dimension. Example: 2.'),
    unit: UnitSchema.describe('The unit of the dimension. Example: "PT".')
});

const ShapeBackgroundFillSchema = z.object({
    propertyState: PropertyStateSchema.optional().describe('Whether the background fill is rendered; set to "NOT_RENDERED" to remove the shape fill.'),
    solidFill: SolidFillSchema.optional().describe('Solid color fill for the shape background.')
});

const OutlineFillSchema = z.object({
    solidFill: SolidFillSchema.optional().describe('Solid color fill for the outline.')
});

const OutlineSchema = z.object({
    outlineFill: OutlineFillSchema.optional().describe('The fill of the outline.'),
    weight: DimensionSchema.optional().describe('The thickness of the outline.'),
    dashStyle: DashStyleSchema.optional().describe('The dash style of the outline.'),
    propertyState: PropertyStateSchema.optional().describe('Whether the outline is rendered; set to "NOT_RENDERED" to remove the outline.')
});

const AutofitSchema = z.object({
    autofitType: AutofitTypeSchema.optional().describe('The autofit type of the shape; only "NONE" is accepted on write requests.')
});

const ShapePropertiesSchema = z.object({
    shapeBackgroundFill: ShapeBackgroundFillSchema.optional().describe('The background fill of the shape.'),
    outline: OutlineSchema.optional().describe('The outline of the shape.'),
    contentAlignment: ContentAlignmentSchema.optional().describe('Vertical alignment of the shape content. Example: "MIDDLE".'),
    autofit: AutofitSchema.optional().describe('The autofit properties of the shape.')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation containing the shape. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI".'),
        objectId: z.string().describe('The object ID of the shape to update. Example: "my_rect_1".'),
        fields: z
            .string()
            .describe(
                'Comma-separated FieldMask of the shapeProperties to update, without the "shapeProperties" root. Example: "shapeBackgroundFill.solidFill.color". Use "*" to update every field.'
            ),
        shapeProperties: ShapePropertiesSchema.describe('The shape properties to apply; only the fields listed in "fields" are updated.')
    })
    .describe("Input for updating a shape's background fill, outline, or content alignment in a Google Slides presentation.");

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was updated.'),
        objectId: z.string().describe('The object ID of the shape that was updated.'),
        fields: z.string().describe('The FieldMask of the shape properties that were requested for update.'),
        shapeProperties: ShapePropertiesSchema.describe('The shape properties that were requested for update.')
    })
    .describe('The presentation and shape that were targeted, plus the shape properties that were requested for update.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing shape's fill, outline, or alignment on the provider via presentations.batchUpdate.
 * @pitfalls: A successful call returns no updated-property data, so it confirms the request was accepted rather than that the shape visibly changed; only fields listed in the FieldMask are applied, setting shapeBackgroundFill.propertyState or outline.propertyState to NOT_RENDERED removes that property and ignores the other fill/outline values sent alongside it, and autofit accepts only NONE on write while any change that affects text fitting silently turns autofit off.
 */
const action = createAction({
    description: "Update a shape's background fill, outline, shadow, or alignment.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        updateShapeProperties: {
                            objectId: input.objectId,
                            shapeProperties: input.shapeProperties,
                            fields: input.fields
                        }
                    }
                ]
            },
            // batchUpdate is not idempotent; retrying after a lost response would repeat the mutation.
            retries: 10
        });

        return {
            presentationId: input.presentationId,
            objectId: input.objectId,
            fields: input.fields,
            shapeProperties: input.shapeProperties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
