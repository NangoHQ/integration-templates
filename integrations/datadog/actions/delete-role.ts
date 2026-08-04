import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    role_id: z.string().trim().min(1).describe('Role ID. Example: "28bd04aa-8f8e-11f1-92b1-da7ad0900002"')
});

const OutputSchema = z.object({
    role_id: z.string()
});

const action = createAction({
    description: 'Delete a role.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://docs.datadoghq.com/api/latest/roles/
            endpoint: `v2/roles/${encodeURIComponent(input.role_id)}`,
            retries: 3
        });

        return {
            role_id: input.role_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
