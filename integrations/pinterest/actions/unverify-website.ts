import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    website: z.string().describe('Website URL to unverify. Example: "https://example.com"')
});

const UserWebsiteSchema = z.object({
    status: z.string().optional(),
    verified_at: z.string().optional(),
    website: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    website: z.string().optional(),
    status: z.string().optional(),
    verified_at: z.string().optional()
});

const action = createAction({
    description: 'Remove verification for a claimed website.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user_accounts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.pinterest.com/docs/api/v5/#tag/user_account-websites/operation/unverify_website/delete
            endpoint: '/v5/user_account/websites',
            params: {
                website: input.website
            },
            retries: 3
        });

        if (response.data && typeof response.data === 'object') {
            const userWebsite = UserWebsiteSchema.parse(response.data);
            return {
                success: true,
                ...(userWebsite.website !== undefined && { website: userWebsite.website }),
                ...(userWebsite.status !== undefined && { status: userWebsite.status }),
                ...(userWebsite.verified_at !== undefined && { verified_at: userWebsite.verified_at })
            };
        }

        return {
            success: true,
            website: input.website
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
