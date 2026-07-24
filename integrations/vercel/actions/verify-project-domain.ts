import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectIdOrName: z.string().describe('The unique project identifier or the project name. Example: "prj_123" or "my-project"'),
    domain: z.string().describe('The domain name to verify. Example: "example.com"')
});

const VerificationSchema = z.object({
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
    redirectStatusCode: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308), z.null()]).optional(),
    gitBranch: z.string().nullable().optional(),
    customEnvironmentId: z.string().nullable().optional(),
    updatedAt: z.number().optional(),
    createdAt: z.number().optional(),
    verified: z.boolean(),
    verification: z.array(VerificationSchema).optional()
});

const OutputSchema = z.object({
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
    verification: z.array(VerificationSchema).optional()
});

const action = createAction({
    description: 'Re-check verification/DNS status for a project domain',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#verify-project-domain
            endpoint: `/v9/projects/${encodeURIComponent(input.projectIdOrName)}/domains/${encodeURIComponent(input.domain)}/verify`,
            data: {},
            retries: 3
        });

        const providerDomain = ProviderDomainSchema.parse(response.data);

        return {
            name: providerDomain.name,
            apexName: providerDomain.apexName,
            projectId: providerDomain.projectId,
            verified: providerDomain.verified,
            ...(providerDomain.redirect != null && { redirect: providerDomain.redirect }),
            ...(providerDomain.redirectStatusCode != null && { redirectStatusCode: providerDomain.redirectStatusCode }),
            ...(providerDomain.gitBranch != null && { gitBranch: providerDomain.gitBranch }),
            ...(providerDomain.customEnvironmentId != null && { customEnvironmentId: providerDomain.customEnvironmentId }),
            ...(providerDomain.updatedAt !== undefined && { updatedAt: providerDomain.updatedAt }),
            ...(providerDomain.createdAt !== undefined && { createdAt: providerDomain.createdAt }),
            ...(providerDomain.verification !== undefined && { verification: providerDomain.verification })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
