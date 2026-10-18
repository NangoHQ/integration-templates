import { z } from 'zod';
import { createAction } from 'nango';

const DimensionSchema = z.object({
    magnitude: z.number().describe('The magnitude of the dimension. Example: 3000000'),
    unit: z.enum(['UNIT_UNSPECIFIED', 'EMU', 'PT']).describe('The units for the magnitude. Example: "EMU"')
});

const SizeSchema = z.object({
    width: DimensionSchema.describe('The width of the image.'),
    height: DimensionSchema.describe('The height of the image.')
});

const TransformSchema = z.object({
    scaleX: z.number().optional().describe('The X coordinate scaling element. Defaults to 1.'),
    scaleY: z.number().optional().describe('The Y coordinate scaling element. Defaults to 1.'),
    shearX: z.number().optional().describe('The X coordinate shearing element. Defaults to 0.'),
    shearY: z.number().optional().describe('The Y coordinate shearing element. Defaults to 0.'),
    translateX: z.number().optional().describe('The X coordinate translation element, in the given unit. Defaults to 0.'),
    translateY: z.number().optional().describe('The Y coordinate translation element, in the given unit. Defaults to 0.'),
    unit: z.enum(['UNIT_UNSPECIFIED', 'EMU', 'PT']).optional().describe('The units for the translate elements. Example: "EMU"')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation to update. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        pageObjectId: z.string().describe('The object ID of the slide (page) the image is inserted onto. Example: "slide_test_1"'),
        url: z.string().describe('Publicly accessible image URL (no auth, at most 2 KB long, PNG/JPEG/GIF, at most 50 MB and 25 megapixels).'),
        objectId: z
            .string()
            .optional()
            .describe(
                'Optional user-supplied object ID for the created image; 5-50 characters, starting alphanumeric or underscore, and unique across the presentation. If omitted, Google generates one.'
            ),
        size: SizeSchema.optional().describe('Optional size for the image. If omitted, the image is inserted at its default size.'),
        transform: TransformSchema.optional().describe('Optional transform for the image. If omitted, the image is placed at the top-left corner of the slide.')
    })
    .describe('Identifies the presentation and slide to insert an image onto, the public image URL, and optional placement details.');

const OutputSchema = z
    .object({
        objectId: z.string().describe('The object ID of the created image, usable in later requests to update or delete it.')
    })
    .describe('The image created inside the presentation.');

const ReplySchema = z.object({
    createImage: z
        .object({
            objectId: z.string()
        })
        .optional()
});

const ResponseSchema = z.object({
    replies: z.array(ReplySchema).optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new image page element inside a presentation via presentations.batchUpdate.
 * @pitfalls: Google downloads and stores its own copy of the image at request time, so the URL must be publicly reachable and later changes to it do not affect the inserted image; the provider may normalize the requested size/transform, so the final placement can differ from what was requested, and a caller-supplied objectId must be unique across the entire presentation or the request fails.
 */
const action = createAction({
    description: 'Insert an image onto a slide from a public image URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const elementProperties = {
            pageObjectId: input.pageObjectId,
            ...(input.size !== undefined && { size: input.size }),
            ...(input.transform !== undefined && { transform: input.transform })
        };

        const createImage = {
            ...(input.objectId !== undefined && { objectId: input.objectId }),
            url: input.url,
            elementProperties
        };

        const response = await nango.post({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [{ createImage }]
            },
            // batchUpdate creates a new image on every call and has no idempotency key; retrying after a lost response could duplicate the image.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ResponseSchema.parse(response.data);
        const created = parsed.replies?.[0]?.createImage;

        if (!created) {
            throw new nango.ActionError({
                type: 'image_not_created',
                message: 'The presentation batchUpdate response did not contain a created image.'
            });
        }

        return {
            objectId: created.objectId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
