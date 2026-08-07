import { z } from 'zod';
import { createAction } from 'nango';

const ProviderProfileSchema = z
    .object({
        id: z.number().describe('User ID. Example: 843757'),
        first_name: z.string(),
        last_name: z.string(),
        email: z.string().optional(),
        is_account_admin: z.boolean().optional(),
        level: z.number().optional(),
        account_id: z.number().optional(),
        time_zone: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number().describe('User ID. Example: 843757'),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().optional(),
    is_account_admin: z.boolean().optional(),
    level: z.number().optional(),
    account_id: z.number().optional(),
    time_zone: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Get the profile of the user this API key belongs to.',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.get({
            endpoint: '/api/v3/profile',
            retries: 3
        });

        const profile = ProviderProfileSchema.parse(response.data);

        return {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            ...(profile.email !== undefined && { email: profile.email }),
            ...(profile.is_account_admin !== undefined && { is_account_admin: profile.is_account_admin }),
            ...(profile.level !== undefined && { level: profile.level }),
            ...(profile.account_id !== undefined && { account_id: profile.account_id }),
            ...(profile.time_zone !== undefined && { time_zone: profile.time_zone }),
            ...(profile.updated_at !== undefined && { updated_at: profile.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
