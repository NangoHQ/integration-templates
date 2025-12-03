/**
 * Instructions: Permanently deletes a file from the workspace
 * API: https://api.slack.com/methods/files.delete
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const Input = z.object({
    file: z.string()
        .describe('The file ID to delete. Example: "F09UG1QNMK7"')
});

const Output = z.object({
    ok: z.boolean()
        .describe('Whether the file was deleted successfully')
});

const action = createAction({
    description: 'Permanently deletes a file from the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/delete-file',
        group: 'Actions'
    },
    input: Input,
    output: Output,
    scopes: ['files:write'],
    exec: async (nango, input): Promise<z.infer<typeof Output>> => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/files.delete
            endpoint: 'files.delete',
            data: {
                file: input.file
            },
            retries: 3
        };
        const response = await nango.post(config);
        return { ok: response.data.ok };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
