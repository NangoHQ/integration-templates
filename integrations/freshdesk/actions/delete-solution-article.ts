import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the solution article to delete.')
    })
    .describe('Input for deleting a solution article.');

const OutputSchema = z.null().describe('Empty null response indicating successful deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes the solution article and all of its translated versions from Freshdesk.
 * @pitfalls: Permanently deletes the article and all of its translated versions.
 */
const action = createAction({
    description: 'Permanently delete a solution article and all of its translated versions in Freshdesk. This cannot be undone.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#delete_solution_article
            endpoint: `/api/v2/solutions/articles/${encodeURIComponent(String(input.id))}`,
            retries: 10
        };

        const response = await nango.delete(config);

        if (response.status >= 400) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: `Failed to delete solution article. Status: ${response.status}`,
                status: response.status
            });
        }

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
