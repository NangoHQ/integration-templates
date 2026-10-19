import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that contains the slide. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        slideId: z.string().describe('The object ID of the slide (or page element) to delete. Example: "SLIDES_API1674887689_0"')
    })
    .describe('Identifies the presentation and the slide (or page element) to permanently remove from it.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation the slide was deleted from.'),
        slideId: z.string().describe('The object ID of the slide that was deleted.'),
        success: z.boolean().describe('True when the deletion request was accepted by the provider.')
    })
    .describe('Confirmation that the slide deletion request was accepted for the given presentation.');

/**
 * @tags: [write, destructive]
 * @tagReason: Calls presentations.batchUpdate with a deleteObject request, permanently removing a slide from the presentation.
 * @pitfalls: The deletion is permanent with no undo or trash/recovery through this API, and the objectId is matched across all slides and page elements, so passing a non-slide element id (shape, image, table, or group) deletes that element instead; an unknown id makes the call fail.
 */
const action = createAction({
    description: 'Permanently delete a slide from a presentation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/request#DeleteObjectRequest
        await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        deleteObject: {
                            objectId: input.slideId
                        }
                    }
                ]
            },
            // Deletion is a non-idempotent mutation: a retry after a lost response would target an already-deleted object and surface a misleading error.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return {
            presentationId: input.presentationId,
            slideId: input.slideId,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
