import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The Apollo ID for the account to archive. Example: "6a0af20b832cec00105fb3a7"')
});

const ProviderAccountSchema = z.object({
    account: z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        domain: z.string().nullable().optional(),
        existence_level: z.string().nullable().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    archived: z.boolean(),
    name: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive an account in Apollo by setting its existence_level to none',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-account',
        group: 'Accounts'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.apollo.io/reference/update-an-account
        const response = await nango.patch({
            endpoint: `/v1/accounts/${encodeURIComponent(input.id)}`,
            data: {
                existence_level: 'none'
            },
            retries: 3
        });

        const providerData = ProviderAccountSchema.parse(response.data);
        const account = providerData.account;

        return {
            id: account.id,
            archived: account.existence_level === 'none',
            ...(account.name != null && { name: account.name })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
