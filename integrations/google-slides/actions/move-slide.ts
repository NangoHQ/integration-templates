import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z
            .string()
            .describe('The ID of the presentation that contains the slides to move. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        slideObjectIds: z
            .array(z.string())
            .min(1)
            .describe('Object IDs of the slides to move, listed in their existing presentation order with no duplicates. Example: ["slide_test_1"]'),
        insertionIndex: z
            .number()
            .int()
            .nonnegative()
            .describe('Zero-based index where the slides should be inserted, evaluated against the slide order before the move takes place. Example: 0')
    })
    .describe('Input for moving one or more slides to a new position in a presentation.');

const ProviderPresentationSchema = z.object({
    slides: z
        .array(
            z.object({
                objectId: z.string()
            })
        )
        .optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was updated.'),
        movedSlideObjectIds: z.array(z.string()).describe('The object IDs of the slides that were moved, as supplied to the action.'),
        insertionIndex: z.number().int().describe('The zero-based index the slides were inserted at, relative to the pre-move slide order.'),
        slideOrder: z.array(z.string()).describe('Object IDs of all slides in the presentation, in their new order after the move.')
    })
    .describe('Result of the slide move, including the resulting slide order read back from the presentation.');

/**
 * @tags: [write]
 * @tagReason: Reorders slides inside an existing presentation, mutating the deck's slide order.
 * @pitfalls: insertionIndex is evaluated against the slide order before the move, not the resulting order, and must be between 0 and the current slide count; slideObjectIds must be listed in existing presentation order with no duplicates, and moving slides to the position they already occupy is a no-op.
 */
const action = createAction({
    description: 'Move one or more slides to a new position in a Google Slides presentation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        // updateSlidesPosition targets an absolute insertionIndex relative to the pre-move order, so it is idempotent and safe to retry.
        await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        updateSlidesPosition: {
                            slideObjectIds: input.slideObjectIds,
                            insertionIndex: input.insertionIndex
                        }
                    }
                ]
            },
            retries: 3
        });

        // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
        const response = await nango.get({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}`,
            params: {
                fields: 'slides(objectId)'
            },
            retries: 3
        });

        const providerPresentation = ProviderPresentationSchema.parse(response.data);
        const slideOrder = (providerPresentation.slides ?? []).map((slide) => slide.objectId);

        return {
            presentationId: input.presentationId,
            movedSlideObjectIds: input.slideObjectIds,
            insertionIndex: input.insertionIndex,
            slideOrder
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
