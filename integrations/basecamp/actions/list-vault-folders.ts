import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The Basecamp project ID (bucket ID) containing the vault.'),
        vaultId: z.number().describe('The ID of the vault to list sub-folders within.'),
        cursor: z.url().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing sub-folders (vaults) inside a Basecamp vault.');

const BucketSchema = z.object({
    id: z.number().describe('Project ID of the bucket.'),
    name: z.string().describe('Project name.'),
    type: z.string().describe('Record type of the bucket, e.g. "Project".')
});

const ParentSchema = z.object({
    id: z.number().describe('ID of the parent vault.'),
    title: z.string().describe('Name of the parent vault.'),
    type: z.string().describe('Record type of the parent, e.g. "Vault".'),
    url: z.string().describe('API URL for the parent vault.'),
    app_url: z.string().describe('Basecamp app URL for the parent vault.')
});

const CreatorSchema = z
    .object({
        id: z.number().describe('Person ID of the creator.'),
        name: z.string().describe('Full name of the creator.'),
        email_address: z.string().describe('Email address of the creator.')
    })
    .passthrough();

const VaultSchema = z
    .object({
        id: z.number().describe('Unique ID of the vault folder.'),
        status: z.string().describe('Current status, e.g. "active" or "trashed".'),
        created_at: z.string().describe('ISO 8601 timestamp when the vault was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the vault was last updated.'),
        title: z.string().describe('Name of the vault folder.'),
        type: z.string().describe('Record type, e.g. "Vault".'),
        url: z.string().describe('API URL for the vault.'),
        app_url: z.string().describe('Basecamp app URL for the vault.'),
        position: z.number().describe('Sort position within the parent vault.'),
        parent: ParentSchema.optional().describe('Parent vault reference, present when the vault is nested.'),
        bucket: BucketSchema.describe('Project bucket containing this vault.'),
        creator: CreatorSchema.describe('Person who created this vault.'),
        documents_count: z.number().describe('Number of documents inside the vault.'),
        documents_url: z.string().describe('API URL to list documents inside the vault.'),
        uploads_count: z.number().describe('Number of uploads inside the vault.'),
        uploads_url: z.string().describe('API URL to list uploads inside the vault.'),
        vaults_count: z.number().describe('Number of sub-vaults (folders) inside the vault.'),
        vaults_url: z.string().describe('API URL to list sub-vaults inside the vault.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        items: z.array(VaultSchema).describe('Array of vault folders found in the specified vault.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page, if more results exist.')
    })
    .describe('Output containing vault sub-folders and an optional pagination cursor.');

// Basecamp's Link-header `next` cursors always point back at this same account-scoped API host.
const BASECAMP_API_ORIGIN = 'https://3.basecampapi.com';

/**
 * @tags: [read]
 * @tagReason: Reads sub-folders (vaults) from a parent vault.
 * @pitfalls: All projects have a primary vault whose ID must be read from the project's dock payload; a fresh top-level vault returns an empty list until sub-folders are explicitly created.
 */
const action = createAction({
    description: 'List sub-folders (nested vaults) inside a vault.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = `/buckets/${encodeURIComponent(String(input.projectId))}/vaults/${encodeURIComponent(String(input.vaultId))}/vaults.json`;
        let baseUrlOverride: string | undefined;

        if (input.cursor) {
            const url = new URL(input.cursor);

            // Reject cursors pointing outside Basecamp's API origin to prevent the authenticated
            // request (and its access token) from being sent to an arbitrary, caller-supplied host.
            if (url.origin !== BASECAMP_API_ORIGIN) {
                throw new nango.ActionError({
                    message: `Invalid cursor: expected a URL on ${BASECAMP_API_ORIGIN}.`
                });
            }

            baseUrlOverride = url.origin;
            endpoint = url.pathname + url.search;
        }

        const items: z.infer<typeof VaultSchema>[] = [];
        let nextCursor: string | undefined;

        // https://github.com/basecamp/bc3-api/blob/master/sections/vaults.md#get-vaults
        const paginated = nango.paginate({
            endpoint,
            baseUrlOverride,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                on_page: async ({ nextPageParam }) => {
                    nextCursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        });

        for await (const page of paginated) {
            const parsed = z.array(VaultSchema).parse(page);
            items.push(...parsed);
            break;
        }

        return {
            items,
            ...(nextCursor && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
