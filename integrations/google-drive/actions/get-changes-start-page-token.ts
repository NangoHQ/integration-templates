import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    startPageToken: z.string().describe('The starting page token for listing future changes')
});

const action = createAction({
    description: 'Get the starting token for listing future changes',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/get-changes-start-page-token',
        group: 'Changes'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/getStartPageToken
        const response = await nango.get({
            endpoint: '/drive/v3/changes/startPageToken',
            retries: 3
        });

        if (!response.data || !response.data.startPageToken) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to get start page token from Google Drive'
            });
        }

        return {
            startPageToken: response.data.startPageToken
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
