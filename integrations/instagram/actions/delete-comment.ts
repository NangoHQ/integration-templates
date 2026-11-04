import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        comment_id: z.string().min(1).describe('The Instagram comment ID to delete. Example: "17895695668004550"')
    })
    .describe('Input for deleting an Instagram comment.');

const ProviderDeleteResponseSchema = z.object({
    success: z.boolean()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether Instagram accepted and processed the comment deletion.')
    })
    .describe('Result of the Instagram comment deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an Instagram comment, permanently removing it from the provider.
 * @pitfalls: Deletion is permanent and cannot be undone; deleting a nonexistent or already-deleted comment fails with a provider error instead of returning success: false.
 */
const action = createAction({
    description: 'Delete an Instagram comment by comment ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['instagram_business_basic', 'instagram_business_manage_comments'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-comment
            endpoint: `/${encodeURIComponent(input.comment_id)}`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0 // Deletion is not idempotent; retrying after a lost response would fail because the comment is already gone.
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            success: providerResponse.success
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
