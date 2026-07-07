import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID to delete. Example: "0oa1a2b3c4d5e6f7g8h9"')
});

const OutputSchema = z.object({
    id: z.string().describe('Deleted application ID.')
});

const action = createAction({
    description: 'Delete an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/apps/#delete-application
        await nango.delete({
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}`,
            retries: 3
        });

        return {
            id: input.appId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
