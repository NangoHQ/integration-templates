import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('SCIM Group ID. Example: "abc123"')
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a SCIM group in 1Password SCIM.',
    version: '1.1.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-scim-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://support.1password.com/scim-endpoints/
            endpoint: `/Groups/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        return {
            id: input.id,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
