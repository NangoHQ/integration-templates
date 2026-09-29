import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the tag to create. Example: "event-registrants"')
    })
    .describe('Input for creating a contact tag');

const ProviderTagSchema = z.object({
    tag_id: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z
    .object({
        tag_id: z.string().describe("Unique identifier of the created tag. Pass it in a contact's taggings array to apply the tag to that contact."),
        name: z.string().describe('Name of the created tag'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the tag was created. Example: "2026-09-29T17:34:36Z"'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the tag was last updated. Example: "2026-09-29T17:34:36Z"')
    })
    .describe('The created contact tag');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact tag on the provider account.
 * @pitfalls: Tag names must be unique; reusing an existing name fails with a 409 conflict error rather than returning the existing tag. Creating a tag does not apply it to any contact; to tag a contact, pass the returned tag_id in that contact's taggings array when creating or updating the contact.
 */
const action = createAction({
    description: 'Create a contact tag',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://v3.developer.constantcontact.com/api_reference/index.html (Tags > Create a Tag - POST /v3/contact_tags)
        const response = await nango.post({
            endpoint: '/v3/contact_tags',
            data: {
                name: input.name
            },
            // Creating a tag is not idempotent: retrying after a lost response could create a duplicate tag
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is deliberate for this non-idempotent create
            retries: 0
        });

        const tag = ProviderTagSchema.parse(response.data);

        return {
            tag_id: tag.tag_id,
            name: tag.name,
            ...(tag.created_at !== undefined && { created_at: tag.created_at }),
            ...(tag.updated_at !== undefined && { updated_at: tag.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
