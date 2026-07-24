import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.number().optional().describe('Pagination cursor (timestamp) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of domains to return.')
});

const ProviderCreatorSchema = z.object({
    email: z.string(),
    id: z.string(),
    username: z.string(),
    customerId: z.string().nullable().optional(),
    isDomainReseller: z.boolean().optional()
});

const ProviderDomainSchema = z.object({
    boughtAt: z.number().nullable(),
    createdAt: z.number(),
    creator: ProviderCreatorSchema,
    expiresAt: z.number().nullable(),
    id: z.string(),
    intendedNameservers: z.array(z.string()),
    name: z.string(),
    nameservers: z.array(z.string()),
    serviceType: z.enum(['external', 'na', 'zeit.world']),
    teamId: z.string().nullable(),
    userId: z.string(),
    verified: z.boolean(),
    customNameservers: z.array(z.string()).optional(),
    renew: z.boolean().optional(),
    transferredAt: z.number().nullable().optional(),
    transferStartedAt: z.number().optional()
});

const ProviderPaginationSchema = z.object({
    count: z.number(),
    next: z.number().nullable(),
    prev: z.number().nullable()
});

const ProviderResponseSchema = z.object({
    domains: z.array(ProviderDomainSchema),
    pagination: ProviderPaginationSchema
});

const DomainSchema = z.object({
    id: z.string(),
    name: z.string(),
    verified: z.boolean(),
    createdAt: z.number(),
    boughtAt: z.number().optional(),
    expiresAt: z.number().optional(),
    creator: z.object({
        id: z.string(),
        username: z.string(),
        email: z.string(),
        customerId: z.string().nullable().optional(),
        isDomainReseller: z.boolean().optional()
    }),
    intendedNameservers: z.array(z.string()),
    nameservers: z.array(z.string()),
    serviceType: z.enum(['external', 'na', 'zeit.world']),
    teamId: z.string().optional(),
    userId: z.string(),
    customNameservers: z.array(z.string()).optional(),
    renew: z.boolean().optional(),
    transferredAt: z.number().optional(),
    transferStartedAt: z.number().optional()
});

const ListOutputSchema = z.object({
    items: z.array(DomainSchema),
    next: z.number().optional()
});

const action = createAction({
    description: 'List domains registered at the team/account level.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://vercel.com/docs/rest-api/domains/list-all-the-domains
        const response = await nango.get({
            endpoint: '/v5/domains',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { until: String(input.cursor) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.domains.map((domain) => ({
                id: domain.id,
                name: domain.name,
                verified: domain.verified,
                createdAt: domain.createdAt,
                ...(domain.boughtAt != null && { boughtAt: domain.boughtAt }),
                ...(domain.expiresAt != null && { expiresAt: domain.expiresAt }),
                creator: domain.creator,
                intendedNameservers: domain.intendedNameservers,
                nameservers: domain.nameservers,
                serviceType: domain.serviceType,
                ...(domain.teamId != null && { teamId: domain.teamId }),
                userId: domain.userId,
                ...(domain.customNameservers !== undefined && { customNameservers: domain.customNameservers }),
                ...(domain.renew !== undefined && { renew: domain.renew }),
                ...(domain.transferredAt != null && { transferredAt: domain.transferredAt }),
                ...(domain.transferStartedAt !== undefined && { transferStartedAt: domain.transferStartedAt })
            })),
            ...(providerResponse.pagination.next != null && { next: providerResponse.pagination.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
