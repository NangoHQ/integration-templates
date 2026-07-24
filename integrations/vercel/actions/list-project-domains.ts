import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('Project ID or name. Example: "prj_fiK50Ju3SQDsgotdoOz0Hj0jHypU" or "nango-test-main"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderVerificationSchema = z.object({
    type: z.string(),
    domain: z.string(),
    value: z.string(),
    reason: z.string()
});

const ProviderDomainSchema = z.object({
    name: z.string(),
    apexName: z.string(),
    projectId: z.string(),
    redirect: z.string().nullable().optional(),
    redirectStatusCode: z
        .union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)])
        .nullable()
        .optional(),
    gitBranch: z.string().nullable().optional(),
    customEnvironmentId: z.string().nullable().optional(),
    updatedAt: z.number().optional(),
    createdAt: z.number().optional(),
    verified: z.boolean(),
    verification: z.array(ProviderVerificationSchema).optional()
});

const DomainSchema = z.object({
    name: z.string(),
    apexName: z.string(),
    projectId: z.string(),
    redirect: z.string().optional(),
    redirectStatusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
    gitBranch: z.string().optional(),
    customEnvironmentId: z.string().optional(),
    updatedAt: z.number().optional(),
    createdAt: z.number().optional(),
    verified: z.boolean(),
    verification: z.array(ProviderVerificationSchema).optional()
});

const OutputSchema = z.object({
    domains: z.array(DomainSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List domains assigned to a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#retrieve-project-domains-by-project-by-id-or-name
            endpoint: `/v9/projects/${encodeURIComponent(input.projectId)}/domains`,
            params: {
                ...(input.cursor && { until: input.cursor })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                domains: z.array(z.unknown()),
                pagination: z.object({
                    count: z.number(),
                    next: z.number().nullable().optional(),
                    prev: z.number().nullable().optional()
                })
            })
            .parse(response.data);

        const domains = providerResponse.domains.map((item: unknown) => {
            const parsed = ProviderDomainSchema.parse(item);
            return {
                name: parsed.name,
                apexName: parsed.apexName,
                projectId: parsed.projectId,
                verified: parsed.verified,
                ...(parsed.redirect !== undefined && parsed.redirect !== null && { redirect: parsed.redirect }),
                ...(parsed.redirectStatusCode !== undefined && parsed.redirectStatusCode !== null && { redirectStatusCode: parsed.redirectStatusCode }),
                ...(parsed.gitBranch !== undefined && parsed.gitBranch !== null && { gitBranch: parsed.gitBranch }),
                ...(parsed.customEnvironmentId !== undefined && parsed.customEnvironmentId !== null && { customEnvironmentId: parsed.customEnvironmentId }),
                ...(parsed.updatedAt !== undefined && { updatedAt: parsed.updatedAt }),
                ...(parsed.createdAt !== undefined && { createdAt: parsed.createdAt }),
                ...(parsed.verification !== undefined && { verification: parsed.verification })
            };
        });

        return {
            domains,
            ...(providerResponse.pagination.next != null && { nextCursor: String(providerResponse.pagination.next) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
