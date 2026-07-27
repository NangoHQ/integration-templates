import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    subdomain: z.string(),
    description: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    website_url: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    accounts: z.array(ProviderAccountSchema)
});

const OutputAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    subdomain: z.string(),
    description: z.string().optional(),
    summary: z.string().optional(),
    website_url: z.string().optional()
});

const OutputSchema = z.object({
    accounts: z.array(OutputAccountSchema)
});

const action = createAction({
    description: 'List accounts accessible to the current token.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/accounts.md
            endpoint: '/accounts',
            baseUrlOverride: 'https://www.workable.com/spi/v3',
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            accounts: providerResponse.accounts.map((account) => ({
                id: account.id,
                name: account.name,
                subdomain: account.subdomain,
                ...(account.description != null && { description: account.description }),
                ...(account.summary != null && { summary: account.summary }),
                ...(account.website_url != null && { website_url: account.website_url })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
