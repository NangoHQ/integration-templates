import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subdomain: z.string().describe('Account subdomain. Example: "nangodev"')
});

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    subdomain: z.string(),
    description: z.string().nullable().optional(),
    summary: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    subdomain: z.string(),
    description: z.string().optional(),
    summary: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single account by subdomain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/accountssubdomain
        const response = await nango.get({
            endpoint: `/spi/v3/accounts/${encodeURIComponent(input.subdomain)}`,
            baseUrlOverride: 'https://www.workable.com',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account not found',
                subdomain: input.subdomain
            });
        }

        const providerAccount = ProviderAccountSchema.parse(response.data);

        return {
            id: providerAccount.id,
            name: providerAccount.name,
            subdomain: providerAccount.subdomain,
            ...(providerAccount.description != null && { description: providerAccount.description }),
            ...(providerAccount.summary != null && { summary: providerAccount.summary })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
