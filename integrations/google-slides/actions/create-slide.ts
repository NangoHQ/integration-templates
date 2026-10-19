import { z } from 'zod';
import { createAction } from 'nango';

const PredefinedLayoutSchema = z
    .enum([
        'BLANK',
        'CAPTION_ONLY',
        'TITLE',
        'TITLE_AND_BODY',
        'TITLE_AND_TWO_COLUMNS',
        'TITLE_ONLY',
        'SECTION_HEADER',
        'SECTION_TITLE_AND_DESCRIPTION',
        'ONE_COLUMN_TEXT',
        'MAIN_POINT',
        'BIG_NUMBER'
    ])
    .describe('Predefined slide layout to build the new slide from. Example: "TITLE_AND_BODY".');

const PlaceholderTypeSchema = z
    .enum([
        'NONE',
        'BODY',
        'CHART',
        'CLIP_ART',
        'CENTERED_TITLE',
        'DIAGRAM',
        'DATE_AND_TIME',
        'FOOTER',
        'HEADER',
        'PICTURE',
        'SLIDE_IMAGE',
        'SLIDE_NUMBER',
        'SUBTITLE',
        'TABLE',
        'TITLE',
        'VIDEO'
    ])
    .describe('Placeholder type on the layout. Example: "BODY".');

const LayoutPlaceholderSchema = z.object({
    type: PlaceholderTypeSchema.optional(),
    index: z.number().int().min(0).optional().describe('Zero-based index of the placeholder of this type on the layout. Example: 0')
});

const PlaceholderIdMappingSchema = z.object({
    objectId: z
        .string()
        .describe('User-supplied object ID to assign to the placeholder created on the new slide. Must be 5-50 characters and unique across the presentation.'),
    layoutPlaceholder: LayoutPlaceholderSchema.optional().describe(
        'Layout placeholder (by type and optional index) that this object ID should be assigned to.'
    ),
    layoutPlaceholderObjectId: z
        .string()
        .optional()
        .describe('Object ID of the layout placeholder that this object ID should be assigned to, as an alternative to layoutPlaceholder.')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('ID of the presentation to add the slide to. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        objectId: z
            .string()
            .optional()
            .describe(
                'Optional user-supplied object ID for the new slide. Must be 5-50 characters, start with an alphanumeric character or underscore, and be unique across the whole presentation. Omit to let the provider auto-generate one (for example "SLIDES_API326449874_0").'
            ),
        insertionIndex: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Optional zero-based index where the slide is inserted. Omit to append the slide at the end of the presentation.'),
        slideLayoutReference: z
            .object({
                predefinedLayout: PredefinedLayoutSchema.optional(),
                layoutId: z.string().optional().describe('Object ID of a layout in the presentation, as an alternative to predefinedLayout.')
            })
            .optional()
            .describe('Layout to build the slide from. When omitted the provider uses the predefined BLANK layout.'),
        placeholderIdMappings: z
            .array(PlaceholderIdMappingSchema)
            .optional()
            .describe('Optional mappings that pin specific object IDs to specific layout placeholders. Can only be used together with slideLayoutReference.')
    })
    .describe('Parameters for inserting a new slide into a presentation.');

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string(),
    replies: z
        .array(
            z.object({
                createSlide: z
                    .object({
                        objectId: z.string()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('ID of the presentation the slide was added to.'),
        objectId: z.string().describe('Object ID of the newly created slide, as assigned by the provider or supplied in the request.')
    })
    .describe('The presentation and the newly created slide.');

/**
 * @tags: [write]
 * @tagReason: Creates a new slide inside an existing presentation via batchUpdate; it adds a page to the deck and is reversible by deleting that slide.
 * @pitfalls: A custom objectId must be 5-50 characters, start with an alphanumeric character or underscore, and be unique across the whole presentation or the request is rejected. Layout placeholders always receive provider-generated objectIds even when the slide's objectId is user-supplied, so use placeholderIdMappings or read the slide back before targeting them. Omitting slideLayoutReference defaults to a BLANK layout with no page elements. insertionIndex is zero-based and omitting it appends the slide.
 */
const action = createAction({
    description: 'Insert a new slide into a presentation, optionally from a predefined layout.',
    version: '1.0.0',
    scopes: ['https://www.googleapis.com/auth/presentations'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createSlide: Record<string, unknown> = {
            ...(input.objectId !== undefined && { objectId: input.objectId }),
            ...(input.insertionIndex !== undefined && { insertionIndex: input.insertionIndex }),
            ...(input.slideLayoutReference !== undefined && {
                slideLayoutReference: {
                    ...(input.slideLayoutReference.predefinedLayout !== undefined && { predefinedLayout: input.slideLayoutReference.predefinedLayout }),
                    ...(input.slideLayoutReference.layoutId !== undefined && { layoutId: input.slideLayoutReference.layoutId })
                }
            }),
            ...(input.placeholderIdMappings !== undefined && {
                placeholderIdMappings: input.placeholderIdMappings.map((mapping) => ({
                    objectId: mapping.objectId,
                    ...(mapping.layoutPlaceholder !== undefined && {
                        layoutPlaceholder: {
                            ...(mapping.layoutPlaceholder.type !== undefined && { type: mapping.layoutPlaceholder.type }),
                            ...(mapping.layoutPlaceholder.index !== undefined && { index: mapping.layoutPlaceholder.index })
                        }
                    }),
                    ...(mapping.layoutPlaceholderObjectId !== undefined && { layoutPlaceholderObjectId: mapping.layoutPlaceholderObjectId })
                }))
            })
        };

        const response = await nango.post({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [{ createSlide }]
            },
            // createSlide is not idempotent: retrying a response that was actually applied would create a second slide (or fail on the duplicate objectId).
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);
        const objectId = parsed.replies?.[0]?.createSlide?.objectId;

        if (!objectId) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'The provider did not return an object ID for the new slide.'
            });
        }

        return {
            presentationId: parsed.presentationId,
            objectId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
