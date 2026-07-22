import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('Domain name to check DNS configuration for. Example: "example.com"'),
    projectIdOrName: z
        .string()
        .optional()
        .describe(
            'The project id or name that will be associated with the domain. Use this when the domain is not yet associated with a project. Example: "prj_fiK50Ju3SQDsgotdoOz0Hj0jHypU"'
        ),
    strict: z
        .boolean()
        .optional()
        .describe(
            "When true, the response will only include the nameservers assigned directly to the specified domain. When false and there are no nameservers assigned directly to the specified domain, the response will include the nameservers of the domain's parent zone."
        ),
    teamId: z.string().optional().describe('The Team identifier to perform the request on behalf of.'),
    slug: z.string().optional().describe('The Team slug to perform the request on behalf of.')
});

// Response shape per https://vercel.com/docs/rest-api/domains/get-a-domain-s-configuration
const ProviderDomainConfigSchema = z
    .object({
        configuredBy: z.enum(['A', 'CNAME', 'dns-01', 'http']).nullable(),
        misconfigured: z.boolean(),
        acceptedChallenges: z.array(z.enum(['dns-01', 'http-01'])),
        recommendedIPv4: z.array(
            z.object({
                rank: z.number(),
                value: z.array(z.string())
            })
        ),
        recommendedCNAME: z.array(
            z.object({
                rank: z.number(),
                value: z.string()
            })
        ),
        // Undocumented, but observed live: keep as optional passthrough-friendly fields.
        nameservers: z.array(z.string()).optional(),
        serviceType: z.string().optional(),
        cnames: z.array(z.string()).optional(),
        aValues: z.array(z.string()).optional(),
        conflicts: z.array(z.unknown()).optional(),
        ipStatus: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = ProviderDomainConfigSchema;

const action = createAction({
    description: 'Retrieve DNS configuration and diagnostic info for a domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:domain_config'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/domains/get-a-domain-s-configuration
            endpoint: `/v6/domains/${encodeURIComponent(input.domain)}/config`,
            params: {
                ...(input.projectIdOrName !== undefined && { projectIdOrName: input.projectIdOrName }),
                ...(input.strict !== undefined && { strict: String(input.strict) }),
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.slug !== undefined && { slug: input.slug })
            },
            retries: 3
        });

        return ProviderDomainConfigSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
