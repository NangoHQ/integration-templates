import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The domain name. Example: "example.com"')
});

const CreatorSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    customerId: z.string().nullable().optional(),
    isDomainReseller: z.boolean().optional()
});

const DomainSchema = z.object({
    id: z.string(),
    name: z.string(),
    suffix: z.boolean(),
    expiresAt: z.number().nullable(),
    verified: z.boolean(),
    nameservers: z.array(z.string()),
    intendedNameservers: z.array(z.string()),
    customNameservers: z.array(z.string()).optional(),
    creator: CreatorSchema,
    teamId: z.string().nullable(),
    boughtAt: z.number().nullable(),
    createdAt: z.number(),
    renew: z.boolean().optional(),
    serviceType: z.enum(['external', 'na', 'zeit.world']),
    transferredAt: z.number().nullable().optional(),
    transferStartedAt: z.number().optional(),
    userId: z.string()
});

const OutputSchema = z.object({
    domain: DomainSchema
});

const action = createAction({
    description: 'Retrieve a single account-level domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/domains/get-information-for-a-single-domain
            endpoint: `/v5/domains/${encodeURIComponent(input.domain)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Domain not found',
                domain: input.domain
            });
        }

        const body = z.object({ domain: DomainSchema }).parse(response.data);

        return {
            domain: body.domain
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
