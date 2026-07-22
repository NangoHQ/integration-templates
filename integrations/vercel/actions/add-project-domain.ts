import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    projectId: z.string().describe('The unique project identifier or project name. Example: "prj_xxx" or "my-project"'),
    name: z.string().describe('The domain name to assign to the project. Example: "example.com"'),
    gitBranch: z.string().nullable().optional().describe('Git branch to link the project domain'),
    redirect: z.string().nullable().optional().describe('Target destination domain for redirect'),
    redirectStatusCode: z
        .union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)])
        .nullable()
        .optional()
        .describe('Status code for domain redirect'),
    customEnvironmentId: z.string().optional().describe('The unique custom environment identifier within the project')
});

const VerificationChallengeSchema = z.object({
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
    verification: z.array(VerificationChallengeSchema).optional()
});

const OutputSchema = z.object({
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

const action = createAction({
    description: 'Assign a domain to a project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            name: input.name
        };

        if (input.gitBranch !== undefined) {
            body['gitBranch'] = input.gitBranch;
        }

        if (input.redirect !== undefined) {
            body['redirect'] = input.redirect;
        }

        if (input.redirectStatusCode !== undefined) {
            body['redirectStatusCode'] = input.redirectStatusCode;
        }

        if (input.customEnvironmentId !== undefined) {
            body['customEnvironmentId'] = input.customEnvironmentId;
        }

        const response = await nango.post({
            // https://vercel.com/docs/rest-api/reference/endpoints/projects#add-a-domain-to-a-project
            endpoint: `/v10/projects/${encodeURIComponent(input.projectId)}/domains`,
            data: body,
            retries: 3
        });

        const providerDomain = ProviderDomainSchema.parse(response.data);

        return {
            name: providerDomain.name,
            apexName: providerDomain.apexName,
            projectId: providerDomain.projectId,
            verified: providerDomain.verified,
            ...(providerDomain.redirect !== undefined && { redirect: providerDomain.redirect }),
            ...(providerDomain.redirectStatusCode !== undefined && { redirectStatusCode: providerDomain.redirectStatusCode }),
            ...(providerDomain.gitBranch !== undefined && { gitBranch: providerDomain.gitBranch }),
            ...(providerDomain.customEnvironmentId !== undefined && { customEnvironmentId: providerDomain.customEnvironmentId }),
            ...(providerDomain.updatedAt !== undefined && { updatedAt: providerDomain.updatedAt }),
            ...(providerDomain.createdAt !== undefined && { createdAt: providerDomain.createdAt }),
            ...(providerDomain.verification !== undefined && { verification: providerDomain.verification })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
