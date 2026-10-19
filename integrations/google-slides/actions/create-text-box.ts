import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that contains the target slide.'),
        pageObjectId: z.string().describe('The object ID of the slide (page) on which the text box will be created.'),
        objectId: z
            .string()
            .optional()
            .describe(
                'Optional user-supplied ID for the text box. Must be 5-50 characters and unique among all pages and page elements in the presentation. If omitted, Google generates one.'
            ),
        width: z
            .number()
            .optional()
            .describe(
                'Width of the text box in EMU (English Metric Units). Must be provided together with height; Google chooses a size when both are omitted.'
            ),
        height: z
            .number()
            .optional()
            .describe(
                'Height of the text box in EMU (English Metric Units). Must be provided together with width; Google chooses a size when both are omitted.'
            ),
        translateX: z.number().optional().describe('Horizontal offset of the text box in EMU, measured from the top-left of the slide.'),
        translateY: z.number().optional().describe('Vertical offset of the text box in EMU, measured from the top-left of the slide.'),
        scaleX: z.number().optional().describe('Horizontal scale factor of the text box transform. Defaults to 1 when omitted.'),
        scaleY: z.number().optional().describe('Vertical scale factor of the text box transform. Defaults to 1 when omitted.')
    })
    .refine((data) => (data.width === undefined) === (data.height === undefined), {
        message: 'width and height must be provided together.'
    })
    .describe('Parameters for creating a new, empty text box on a slide.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was updated.'),
        pageObjectId: z.string().describe('The object ID of the slide the text box was created on.'),
        objectId: z.string().describe('The object ID of the newly created text box, to be used for subsequent text edits.')
    })
    .describe('The created text box and the slide it was added to.');

const CreateShapeResponseSchema = z.object({
    objectId: z.string()
});

const BatchUpdateResponseSchema = z.object({
    replies: z
        .array(
            z
                .object({
                    createShape: CreateShapeResponseSchema.optional()
                })
                .passthrough()
        )
        .optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new text box shape inside an existing presentation (a provider mutation).
 * @pitfalls: A custom objectId must be 5-50 characters and unique across the whole presentation (not just the target slide), and omitting it lets Google generate one; Google may normalize the size and transform you send, so re-read the slide to learn the actual placement; the new box is empty but its text always ends with a mandatory trailing newline that shifts text indices.
 */
const action = createAction({
    description: 'Insert a new, empty text box onto a slide, ready to receive text.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if ((input.width === undefined) !== (input.height === undefined)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'width and height must be provided together.'
            });
        }

        const elementProperties: {
            pageObjectId: string;
            size?: {
                width: { magnitude: number; unit: string };
                height: { magnitude: number; unit: string };
            };
            transform?: {
                scaleX?: number;
                scaleY?: number;
                translateX?: number;
                translateY?: number;
                unit: string;
            };
        } = {
            pageObjectId: input.pageObjectId
        };

        if (input.width !== undefined && input.height !== undefined) {
            elementProperties.size = {
                width: { magnitude: input.width, unit: 'EMU' },
                height: { magnitude: input.height, unit: 'EMU' }
            };
        }

        if (input.scaleX !== undefined || input.scaleY !== undefined || input.translateX !== undefined || input.translateY !== undefined) {
            elementProperties.transform = {
                scaleX: input.scaleX ?? 1,
                scaleY: input.scaleY ?? 1,
                ...(input.translateX !== undefined && { translateX: input.translateX }),
                ...(input.translateY !== undefined && { translateY: input.translateY }),
                unit: 'EMU'
            };
        }

        const createShapeRequest: {
            shapeType: string;
            elementProperties: typeof elementProperties;
            objectId?: string;
        } = {
            shapeType: 'TEXT_BOX',
            elementProperties,
            ...(input.objectId !== undefined && { objectId: input.objectId })
        };

        const config: ProxyConfiguration = {
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [{ createShape: createShapeRequest }]
            },
            // createShape is not idempotent: a retry after a lost response can create a duplicate text box.
            retries: 0 // eslint-disable-line @nangohq/custom-integrations-linting/proxy-call-retries
        };

        const response = await nango.post(config);

        const parsed = BatchUpdateResponseSchema.parse(response.data);
        const objectId = parsed.replies?.[0]?.createShape?.objectId;

        if (!objectId) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The Slides API did not return an object ID for the created text box.',
                presentationId: input.presentationId
            });
        }

        return {
            presentationId: input.presentationId,
            pageObjectId: input.pageObjectId,
            objectId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
