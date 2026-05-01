import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the filter to delete. Example: "ABC123"')
});

const OutputSchema = z.null();

const action = createAction({
    description: 'Delete a mailbox filter by filter ID',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-filter',
        group: 'Filters'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.basic'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters/delete
        await nango.delete({
            endpoint: `/gmail/v1/users/me/settings/filters/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
