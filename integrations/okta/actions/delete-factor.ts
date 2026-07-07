import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14u78lfuUpDWf0698"'),
    factorId: z.string().describe('Factor ID. Example: "ost14u7gbraSXvpXE698"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Unenroll (delete) a factor from a user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.factors.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.okta.com/docs/reference/api/factors/#unenroll-factor
        await nango.delete({
            endpoint: `/api/v1/users/${encodeURIComponent(input.userId)}/factors/${encodeURIComponent(input.factorId)}`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
