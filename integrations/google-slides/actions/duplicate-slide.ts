import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z
            .string()
            .describe('The ID of the presentation containing the slide or page element to duplicate. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        objectId: z.string().describe('The object ID of the slide (or page element such as a shape, image, table, or group) to duplicate. Example: "p"')
    })
    .describe('Identifies the presentation and the slide or page element to duplicate.');

const DuplicateObjectResponseSchema = z.object({
    objectId: z.string()
});

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string(),
    replies: z
        .array(
            z
                .object({
                    duplicateObject: DuplicateObjectResponseSchema.optional()
                })
                .passthrough()
        )
        .optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation the duplicate was created in.'),
        duplicatedObjectId: z.string().describe('The object ID of the newly created duplicate, inserted immediately after the original.')
    })
    .describe('The presentation that was updated and the object ID of the new duplicate.');

/**
 * @tags: [write]
 * @tagReason: Creates a new duplicate slide (or page element) in the presentation; it does not modify or remove existing content.
 * @pitfalls: The duplicate and all of its child page elements get new auto-generated objectIds, so IDs from the source slide cannot be reused on the copy; if a page element's objectId is passed instead of a slide's, that element is duplicated in place and no new slide is created.
 */
const action = createAction({
    description: 'Create a copy of an existing slide, inserted immediately after the original.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        duplicateObject: {
                            objectId: input.objectId
                        }
                    }
                ]
            },
            // batchUpdate is not idempotent: each call creates a new duplicate, so a retry after a lost response would add an extra copy.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);
        const duplicatedObjectId = parsed.replies?.[0]?.duplicateObject?.objectId;

        if (!duplicatedObjectId) {
            throw new nango.ActionError({
                type: 'duplicate_failed',
                message: 'The batchUpdate response did not include a duplicated object ID.',
                presentationId: input.presentationId,
                objectId: input.objectId
            });
        }

        return {
            presentationId: parsed.presentationId,
            duplicatedObjectId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
