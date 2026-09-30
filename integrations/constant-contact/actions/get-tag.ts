import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        tag_id: z.string().describe('Unique identifier of the contact tag to retrieve. Example: "92229c0c-bc34-11f1-bccd-02420a320002"')
    })
    .describe('Input for retrieving a single contact tag.');

const OutputSchema = z
    .object({
        tag_id: z.string().describe('Unique identifier of the contact tag.'),
        name: z.string().describe('Name of the contact tag.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the tag was created. Example: "2026-09-29T18:35:40Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the tag was last updated. Example: "2026-09-29T18:35:40Z"')
    })
    .describe('A single contact tag.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single contact tag from the provider without modifying any data.
 * @pitfalls: Tag deletion is asynchronous on the provider side, so a tag can still be returned briefly after a successful delete until the delete job finishes.
 */
const action = createAction({
    description: 'Retrieve a single contact tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html — GET /v3/contact_tags/{tag_id}
            endpoint: `/v3/contact_tags/${encodeURIComponent(input.tag_id)}`,
            retries: 3
        };
        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
