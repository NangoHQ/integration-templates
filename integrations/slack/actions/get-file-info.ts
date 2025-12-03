/**
 * Instructions: Retrieves details about a specific file
 * API: https://api.slack.com/methods/files.info
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    file: z.string()
        .describe('The file ID to get info for. Example: "F09UG1QNMK7"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the request was successful'),
    file: z.any()
        .describe('The file object with details like name, size, url, etc.')
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
