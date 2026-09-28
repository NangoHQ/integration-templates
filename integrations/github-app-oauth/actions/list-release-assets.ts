import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const InputSchema = z
    .object({
        owner: z.string().describe('Repository owner. Example: "nango-provisioned-apps"'),
        repo: z.string().describe('Repository name. Example: "nango"'),
        release_id: z.number().describe('Release ID. Example: 12345'),
        per_page: z.number().optional().describe('Number of assets to return per page. Defaults to 30.'),
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input parameters for listing release assets.');

const ProviderAssetSchema = z.object({
    id: z.number(),
    name: z.string(),
    url: z.string(),
    browser_download_url: z.string(),
    content_type: z.string(),
    state: z.string(),
    size: z.number(),
    download_count: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
    label: z.string().nullable().optional(),
    uploader: z
        .object({
            login: z.string().optional(),
            id: z.number().optional()
        })
        .optional()
        .nullable()
});

const AssetSchema = z.object({
    id: z.number().describe('Asset ID.'),
    name: z.string().describe('Asset file name.'),
    url: z.string().describe('API URL for the asset.'),
    browser_download_url: z.string().describe('Direct download URL for the asset.'),
    content_type: z.string().describe('MIME type of the asset.'),
    state: z.string().describe('State of the asset (e.g., "uploaded").'),
    size: z.number().describe('Size of the asset in bytes.'),
    download_count: z.number().describe('Number of times the asset has been downloaded.'),
    created_at: z.string().describe('Timestamp when the asset was created.'),
    updated_at: z.string().describe('Timestamp when the asset was last updated.'),
    label: z.string().optional().describe('Display label for the asset.'),
    uploader: z
        .object({
            login: z.string().optional().describe('Username of the user who uploaded the asset.'),
            id: z.number().optional().describe('User ID of the uploader.')
        })
        .optional()
        .describe('User who uploaded the asset.')
});

const OutputSchema = z
    .object({
        assets: z.array(AssetSchema).describe('List of release assets.'),
        next_page: z.string().optional().describe('Next page number for pagination. Omit when there are no more pages.')
    })
    .describe('List of release assets with pagination info.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a list of assets attached to a release without modifying any data.
 * @pitfalls: GitHub renames asset filenames that contain special characters, non-alphanumeric characters, or leading or trailing periods, so the returned `name` may differ from the original upload name.
 */
const action = createAction({
    description: 'List assets uploaded to a repository release.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contents:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (Number.isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a valid positive integer page number.'
            });
        }

        const config: ProxyConfiguration = {
            // https://docs.github.com/rest/releases/assets#list-release-assets
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/releases/${encodeURIComponent(String(input.release_id))}/assets`,
            params: {
                ...(input.per_page !== undefined && { per_page: String(input.per_page) }),
                page: String(page)
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerAssets = z.array(ProviderAssetSchema).parse(response.data);

        const assets = providerAssets.map((asset) => {
            return {
                id: asset.id,
                name: asset.name,
                url: asset.url,
                browser_download_url: asset.browser_download_url,
                content_type: asset.content_type,
                state: asset.state,
                size: asset.size,
                download_count: asset.download_count,
                created_at: asset.created_at,
                updated_at: asset.updated_at,
                ...(asset.label != null && { label: asset.label }),
                ...(asset.uploader != null && {
                    uploader: {
                        ...(asset.uploader.login != null && { login: asset.uploader.login }),
                        ...(asset.uploader.id != null && { id: asset.uploader.id })
                    }
                })
            };
        });

        const next_page = assets.length > 0 && (input.per_page === undefined || assets.length === input.per_page) ? String(page + 1) : undefined;

        return {
            assets,
            ...(next_page !== undefined && { next_page })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
