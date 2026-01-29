/**
 * Instructions: Retrieves details about a specific file
 * API: https://api.slack.com/methods/files.info
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    file: z.string().describe('The file ID to get info for. Example: "F09UG1QNMK7"')
});

const SlackFileSchema = z.object({
    id: z.string(),
    created: z.number().optional(),
    timestamp: z.number().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    mimetype: z.string().optional(),
    filetype: z.string().optional(),
    pretty_type: z.string().optional(),
    user: z.string().optional(),
    user_team: z.string().optional(),
    editable: z.boolean().optional(),
    size: z.number().optional(),
    mode: z.string().optional(),
    is_external: z.boolean().optional(),
    external_type: z.string().optional(),
    is_public: z.boolean().optional(),
    public_url_shared: z.boolean().optional(),
    display_as_bot: z.boolean().optional(),
    username: z.string().optional(),
    url_private: z.string().optional(),
    url_private_download: z.string().optional(),
    permalink: z.string().optional(),
    permalink_public: z.string().optional(),
    is_starred: z.boolean().optional(),
    has_rich_preview: z.boolean().optional(),
    file_access: z.string().optional()
});

const Output = z.object({
    ok: z.boolean().describe('Whether the request was successful'),
    file: SlackFileSchema.describe('The file object with details like name, size, url, etc.')
});

const action = createAction({
    description: 'Retrieves details about a specific file.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/get-file-info',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['files:read'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/files.info
            endpoint: 'files.info',
            params: {
                file: input.file
            },
            retries: 3
        };
        const response = await nango.get(config);
        return {
            ok: response.data.ok,
            file: response.data.file
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
