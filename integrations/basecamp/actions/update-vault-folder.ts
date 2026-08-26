import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The ID of the project that contains the vault.'),
        vaultId: z.number().describe('The ID of the vault to rename.'),
        title: z.string().describe('The new title for the vault.')
    })
    .describe('Input for renaming a vault folder.');

const BucketSchema = z.object({
    id: z.number().describe('The ID of the bucket.'),
    name: z.string().describe('The name of the bucket.'),
    type: z.string().describe('The type of the bucket.')
});

const CreatorSchema = z.object({
    id: z.number().describe('The ID of the creator.'),
    name: z.string().describe('The name of the creator.'),
    email_address: z.string().nullable().optional().describe('The email address of the creator, if exposed by the provider.')
});

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the vault.'),
        status: z.string().describe('The status of the vault.'),
        created_at: z.string().describe('The creation timestamp of the vault.'),
        updated_at: z.string().describe('The last updated timestamp of the vault.'),
        type: z.string().describe('The type of the vault.'),
        url: z.string().describe('The API URL of the vault.'),
        app_url: z.string().describe('The app URL of the vault.'),
        title: z.string().describe('The title of the vault.'),
        bucket: BucketSchema.describe('The project bucket containing the vault.'),
        creator: CreatorSchema.describe('The creator of the vault.'),
        documents_count: z.number().describe('The number of documents in the vault.'),
        uploads_count: z.number().describe('The number of uploads in the vault.')
    })
    .describe('Output of a renamed vault folder.');

/**
 * @tags: [write]
 * @tagReason: Updates the title of an existing vault folder via a PUT request.
 * @pitfalls: Renaming the top-level 'Docs & Files' vault for a project works but is unusual in practice.
 */
const action = createAction({
    description: 'Rename a vault folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/vaults.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/vaults/${encodeURIComponent(input.vaultId)}.json`,
            data: {
                title: input.title
            },
            retries: 3
        });

        const vault = OutputSchema.parse(response.data);

        return vault;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
