import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectIdOrName: z.string().describe('The unique project identifier or the project name. Example: "nango-test-main"'),
    domain: z.string().describe('The project domain name. Example: "nango-test-main.vercel.app"')
});

const VerificationChallengeSchema = z.object({
    type: z.string(),
    domain: z.string(),
    value: z.string(),
    reason: z.string()
});

const ProviderProjectDomainSchema = z.object({
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
    verification: z.array(VerificationChallengeSchema).optional()
});

// Output reuses the provider schema directly (same shape) instead of hand-duplicating every
// field, so a future Vercel schema change only needs to be made in one place.
const OutputSchema = ProviderProjectDomainSchema;

const action = createAction({
    description: 'Retrieve a single project domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/projects/get-a-project-domain
            endpoint: `/v9/projects/${encodeURIComponent(input.projectIdOrName)}/domains/${encodeURIComponent(input.domain)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project domain not found',
                projectIdOrName: input.projectIdOrName,
                domain: input.domain
            });
        }

        const providerDomain = ProviderProjectDomainSchema.parse(response.data);

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
