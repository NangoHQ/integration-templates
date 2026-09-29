import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tag_id: z.string().describe('The unique identifier of the contact tag to rename. Example: "f81e4a72-7f4c-4b3a-9a3d-2f6d3f0c9a11"'),
        name: z.string().describe('The new name for the contact tag. Example: "vip-customers"')
    })
    .describe('Input for renaming a Constant Contact contact tag');

const ProviderTagSchema = z.object({
    tag_id: z.string(),
    name: z.string(),
    contacts_count: z.number().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        tag_id: z.string().describe('The unique identifier of the renamed contact tag. It is unchanged by the rename'),
        name: z.string().describe('The new name of the contact tag'),
        contacts_count: z.number().optional().describe('The number of contacts tagged with this tag, when returned by the provider'),
        created_at: z.string().describe('ISO 8601 timestamp of when the tag was created. Example: "2026-09-29T18:35:34Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the tag was last updated. Example: "2026-09-29T18:36:10Z"')
    })
    .describe('The renamed Constant Contact contact tag');

/**
 * @tags: [write]
 * @tagReason: Renames an existing contact tag through a provider mutation.
 */
const action = createAction({
    description: 'Rename a contact tag',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html
        const response = await nango.put({
            endpoint: `/v3/contact_tags/${encodeURIComponent(input.tag_id)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const tag = ProviderTagSchema.parse(response.data);

        return {
            tag_id: tag.tag_id,
            name: tag.name,
            ...(tag.contacts_count !== undefined && { contacts_count: tag.contacts_count }),
            created_at: tag.created_at,
            updated_at: tag.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
