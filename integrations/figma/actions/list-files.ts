import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('ID of the project to list files from. Example: "604829489"'),
    branch_data: z.boolean().optional().describe('Returns branch metadata in the response for each main file with a branch inside the project.')
});

const ProviderFileSchema = z.object({
    key: z.string(),
    name: z.string(),
    thumbnail_url: z.string().optional(),
    last_modified: z.string()
});

const ProviderResponseSchema = z.object({
    name: z.string(),
    files: z.array(ProviderFileSchema)
});

const OutputSchema = z.object({
    name: z.string(),
    files: z.array(
        z.object({
            key: z.string(),
            name: z.string(),
            thumbnail_url: z.string().optional(),
            last_modified: z.string()
        })
    )
});

const action = createAction({
    description: 'List files from Figma.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-files',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:read', 'files:read'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://developers.figma.com/docs/rest-api/projects-endpoints/#get-project-files
            endpoint: `/v1/projects/${encodeURIComponent(input.project_id)}/files`,
            params: {
                ...(input.branch_data !== undefined && { branch_data: String(input.branch_data) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            name: providerResponse.name,
            files: providerResponse.files.map((file) => ({
                key: file.key,
                name: file.name,
                ...(file.thumbnail_url !== undefined && { thumbnail_url: file.thumbnail_url }),
                last_modified: file.last_modified
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
