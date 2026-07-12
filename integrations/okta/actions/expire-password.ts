import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('User ID. Example: "00u14y5oijeYKVDn0698"'),
    tempPassword: z.boolean().optional().describe('If true, returns a temporary password for the user.')
});

const ProviderTempPasswordSchema = z.object({
    tempPassword: z.string()
});

const ProviderUserSchema = z.object({
    id: z.string(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string().optional().describe('User ID, returned when tempPassword is false or omitted.'),
    tempPassword: z.string().optional().describe('Temporary password, returned when tempPassword is true.'),
    status: z.string().optional().describe('User status, returned when tempPassword is false or omitted.')
});

const action = createAction({
    description: "Expire a user's current password, forcing a change on next login.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.users.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedUserId = encodeURIComponent(input.userId);
        const tempPasswordParam = input.tempPassword === true ? 'true' : 'false';

        const response = await nango.post({
            // https://developer.okta.com/docs/reference/api/users/#expire-password
            endpoint: `/api/v1/users/${encodedUserId}/lifecycle/expire_password`,
            params: {
                tempPassword: tempPasswordParam
            },
            retries: 3
        });

        const data = response.data;

        if (data && typeof data === 'object' && 'tempPassword' in data && typeof data.tempPassword === 'string') {
            const tempPasswordResult = ProviderTempPasswordSchema.parse(data);
            return {
                tempPassword: tempPasswordResult.tempPassword
            };
        }

        const userResult = ProviderUserSchema.parse(data);
        return {
            id: userResult.id,
            ...(userResult.status !== undefined && { status: userResult.status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
