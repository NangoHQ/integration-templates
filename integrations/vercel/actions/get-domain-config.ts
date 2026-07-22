import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('Domain name to check DNS configuration for. Example: "example.com"')
});

const VerificationRecordSchema = z.object({
    type: z.string(),
    domain: z.string(),
    value: z.string(),
    reason: z.string()
});

const ProviderDomainConfigSchema = z
    .object({
        misconfigured: z.boolean(),
        configuredBy: z.string().nullable().optional(),
        nameservers: z.array(z.string()).optional(),
        cdnEnabled: z.boolean().optional(),
        aValues: z.array(z.string()).optional(),
        cnameValue: z.string().nullable().optional(),
        verification: z.array(VerificationRecordSchema).optional(),
        hasARecords: z.boolean().optional(),
        hasCnameRecords: z.boolean().optional(),
        hasTxtRecords: z.boolean().optional(),
        hasMxRecords: z.boolean().optional(),
        hasNsRecords: z.boolean().optional(),
        hasSrvRecords: z.boolean().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        misconfigured: z.boolean(),
        configuredBy: z.string().optional(),
        nameservers: z.array(z.string()).optional(),
        cdnEnabled: z.boolean().optional(),
        aValues: z.array(z.string()).optional(),
        cnameValue: z.string().optional(),
        verification: z.array(VerificationRecordSchema).optional(),
        hasARecords: z.boolean().optional(),
        hasCnameRecords: z.boolean().optional(),
        hasTxtRecords: z.boolean().optional(),
        hasMxRecords: z.boolean().optional(),
        hasNsRecords: z.boolean().optional(),
        hasSrvRecords: z.boolean().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve DNS configuration and diagnostic info for a domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:domain_config'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://vercel.com/docs/rest-api/reference
            endpoint: `/v6/domains/${encodeURIComponent(input.domain)}/config`,
            retries: 3
        });

        const config = ProviderDomainConfigSchema.parse(response.data);

        return {
            misconfigured: config.misconfigured,
            ...(config.configuredBy != null && { configuredBy: config.configuredBy }),
            ...(config.nameservers !== undefined && { nameservers: config.nameservers }),
            ...(config.cdnEnabled !== undefined && { cdnEnabled: config.cdnEnabled }),
            ...(config.aValues !== undefined && { aValues: config.aValues }),
            ...(config.cnameValue != null && { cnameValue: config.cnameValue }),
            ...(config.verification !== undefined && { verification: config.verification }),
            ...(config.hasARecords !== undefined && { hasARecords: config.hasARecords }),
            ...(config.hasCnameRecords !== undefined && { hasCnameRecords: config.hasCnameRecords }),
            ...(config.hasTxtRecords !== undefined && { hasTxtRecords: config.hasTxtRecords }),
            ...(config.hasMxRecords !== undefined && { hasMxRecords: config.hasMxRecords }),
            ...(config.hasNsRecords !== undefined && { hasNsRecords: config.hasNsRecords }),
            ...(config.hasSrvRecords !== undefined && { hasSrvRecords: config.hasSrvRecords })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
