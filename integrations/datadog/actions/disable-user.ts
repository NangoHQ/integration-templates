import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    user_id: z.string().trim().min(1).describe('The user ID to disable. Example: "b8b30a2e-fdce-46d6-aef0-63ccf6155094"')
});

const OutputSchema = z.object({
    user_id: z.string(),
    disabled: z.boolean()
});

const action = createAction({
    description: 'Disable (deactivate) a user, preventing further login.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_access_manage'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.delete({
            // https://docs.datadoghq.com/api/latest/users/#disable-a-user
            endpoint: `v2/users/${encodeURIComponent(input.user_id)}`,
            retries: 3
        });

        return {
            user_id: input.user_id,
            disabled: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
