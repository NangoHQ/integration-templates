import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z
            .string()
            .describe('The ID of the presentation that contains the page elements to group. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        childrenObjectIds: z
            .array(z.string())
            .min(2)
            .describe(
                'Object IDs of the page elements to group. Must contain at least two page elements that live on the same slide and are not already inside another group.'
            ),
        groupObjectId: z
            .string()
            .optional()
            .describe(
                'Optional user-supplied object ID for the new group. Must be 5-50 characters, start with a letter, digit, or underscore, and be unique across the entire presentation. If omitted, Google generates one.'
            )
    })
    .describe('Groups two or more page elements on a slide into a single group.');

const ProviderBatchUpdateResponseSchema = z.object({
    presentationId: z.string().optional(),
    replies: z
        .array(
            z.object({
                groupObjects: z
                    .object({
                        objectId: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation the group was created in.'),
        objectId: z.string().describe('The object ID of the newly created group page element.')
    })
    .describe('The group page element that was created.');

/**
 * @tags: [write]
 * @tagReason: Creates a new group page element inside the presentation through batchUpdate, mutating provider state.
 * @pitfalls: Only page elements can be grouped, and videos, tables, and placeholders cannot; all children must be top-level elements on the same slide and not already in another group. A supplied groupObjectId must be 5-50 characters and unique across the entire presentation, not just the slide. Grouping replaces the children with one group element; it can be reversed with the Slides API ungroupObjects request, which this integration does not expose as an action.
 */
const action = createAction({
    description: 'Combine two or more page elements on a slide into a single group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        groupObjects: {
                            ...(input.groupObjectId !== undefined && { groupObjectId: input.groupObjectId }),
                            childrenObjectIds: input.childrenObjectIds
                        }
                    }
                ]
            },
            // Not retried: if the first attempt was applied but its response was lost, a retry fails with "cannot be grouped" and would turn a success into an error.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderBatchUpdateResponseSchema.parse(response.data);
        const objectId = parsed.replies?.[0]?.groupObjects?.objectId;

        if (objectId === undefined) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The batchUpdate response did not contain a groupObjects reply with an objectId.',
                presentationId: input.presentationId
            });
        }

        return {
            presentationId: parsed.presentationId ?? input.presentationId,
            objectId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
