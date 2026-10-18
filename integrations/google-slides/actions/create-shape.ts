import { z } from 'zod';
import { createAction } from 'nango';

const UnitSchema = z.enum(['EMU', 'PT']).describe('Measurement unit. EMU is the default (914400 EMU = 1 inch).');

const DimensionSchema = z.object({
    magnitude: z.number().describe('Numeric measurement value, expressed in `unit`.'),
    unit: UnitSchema.optional()
});

const SizeSchema = z.object({
    width: DimensionSchema.optional().describe('Width of the element.'),
    height: DimensionSchema.optional().describe('Height of the element.')
});

const AffineTransformSchema = z.object({
    scaleX: z.number().optional().describe('X-axis scale factor.'),
    scaleY: z.number().optional().describe('Y-axis scale factor.'),
    shearX: z.number().optional().describe('X-axis shear factor.'),
    shearY: z.number().optional().describe('Y-axis shear factor.'),
    translateX: z.number().optional().describe('X-axis translation, in `unit`.'),
    translateY: z.number().optional().describe('Y-axis translation, in `unit`.'),
    unit: UnitSchema.optional()
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('ID of the presentation to add the shape to. Example: "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789".'),
        pageObjectId: z.string().describe('Object ID of the slide (page) where the shape is placed. Example: "SLIDES_API123456789_0".'),
        shapeType: z
            .string()
            .describe('Shape type to create, e.g. RECTANGLE, ELLIPSE, ARROW_EAST or TEXT_BOX. See the Slides API Shape.Type enum for the full list.'),
        objectId: z
            .string()
            .optional()
            .describe(
                'Optional user-supplied object ID for the new shape (5-50 characters, starting with a letter, digit or underscore, unique across all pages and page elements). Omit to let Google generate one.'
            ),
        size: SizeSchema.optional().describe('Optional size of the shape, in EMU (914400 EMU = 1 inch).'),
        transform: AffineTransformSchema.optional().describe('Optional transform of the shape (placement, scale, shear) relative to the slide.')
    })
    .describe('Input for adding a new shape to a slide.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('ID of the presentation that now contains the new shape.'),
        pageObjectId: z.string().describe('Object ID of the slide the shape was added to.'),
        objectId: z.string().describe('Object ID of the newly created shape.'),
        shapeType: z.string().describe('Shape type of the created shape, e.g. RECTANGLE or ELLIPSE.'),
        size: SizeSchema.optional().describe('Actual size of the created shape as stored by Google, read back from the slide.'),
        transform: AffineTransformSchema.optional().describe(
            'Actual transform of the created shape as stored by Google, read back from the slide; Google may normalize the values you requested.'
        )
    })
    .describe('The created shape, including its actual stored size and transform as read back from the slide.');

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string().optional(),
    replies: z
        .array(
            z.object({
                createShape: z
                    .object({
                        objectId: z.string()
                    })
                    .optional()
            })
        )
        .optional()
});

const PageElementSchema = z.object({
    objectId: z.string(),
    size: SizeSchema.optional(),
    transform: AffineTransformSchema.optional(),
    shape: z
        .object({
            shapeType: z.string()
        })
        .optional()
});

const PageResponseSchema = z.object({
    pageElements: z.array(PageElementSchema).optional()
});

/**
 * @tags: [read, write]
 * @tagReason: Reads the slide back to report the created shape's actual placement after mutating the presentation with a new shape.
 * @pitfalls: Google may store a size/transform different from what you requested (returned values are re-read from the slide); a supplied objectId must be 5-50 characters starting with a letter, digit or underscore and be unique across the entire presentation, not just the target slide.
 */
const action = createAction({
    description: 'Insert a new shape (rectangle, ellipse, arrow, etc) onto a slide.',
    version: '1.0.0',
    scopes: ['https://www.googleapis.com/auth/presentations'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const batchUpdateResponse = await nango.post({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        createShape: {
                            ...(input.objectId !== undefined && { objectId: input.objectId }),
                            shapeType: input.shapeType,
                            elementProperties: {
                                pageObjectId: input.pageObjectId,
                                ...(input.size !== undefined && { size: input.size }),
                                ...(input.transform !== undefined && { transform: input.transform })
                            }
                        }
                    }
                ]
            },
            // Creating a shape is not idempotent: retrying after a lost response would add a second shape.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const batchUpdate = BatchUpdateResponseSchema.parse(batchUpdateResponse.data);

        let objectId: string | undefined;
        for (const reply of batchUpdate.replies ?? []) {
            if (reply.createShape !== undefined) {
                objectId = reply.createShape.objectId;
                break;
            }
        }

        if (objectId === undefined) {
            throw new nango.ActionError({
                type: 'shape_not_created',
                message: 'The batchUpdate response did not include a createShape reply with an objectId.',
                presentationId: input.presentationId,
                pageObjectId: input.pageObjectId
            });
        }

        const pageResponse = await nango.get({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations.pages/get
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}/pages/${encodeURIComponent(input.pageObjectId)}`,
            retries: 3
        });

        const page = PageResponseSchema.parse(pageResponse.data);
        const element = (page.pageElements ?? []).find((pageElement) => pageElement.objectId === objectId);

        const size = element?.size;
        const transform = element?.transform;

        return {
            presentationId: batchUpdate.presentationId ?? input.presentationId,
            pageObjectId: input.pageObjectId,
            objectId,
            shapeType: element?.shape?.shapeType ?? input.shapeType,
            ...(size !== undefined && { size }),
            ...(transform !== undefined && { transform })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
