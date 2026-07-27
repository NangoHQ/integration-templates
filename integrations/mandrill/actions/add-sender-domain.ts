import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The domain name to add for SPF/DKIM verification. Example: "example.com"')
});

const ProviderVerificationDetailSchema = z.object({
    valid: z.boolean().optional(),
    valid_after: z.string().nullable().optional(),
    error: z.string().nullable().optional()
});

const ProviderDmarcDetailSchema = z.object({
    valid: z.boolean().optional(),
    error: z.string().nullable().optional()
});

const ProviderSenderDomainSchema = z.object({
    domain: z.string().optional(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    spf: ProviderVerificationDetailSchema.optional(),
    dkim: ProviderVerificationDetailSchema.optional(),
    dkim2: ProviderVerificationDetailSchema.optional(),
    dmarc: ProviderDmarcDetailSchema.optional(),
    verified_at: z.string().nullable().optional(),
    valid_signing: z.boolean().optional(),
    verify_txt_key: z.string().optional()
});

const OutputVerificationDetailSchema = z.object({
    valid: z.boolean().optional(),
    valid_after: z.string().optional(),
    error: z.string().optional()
});

const OutputDmarcDetailSchema = z.object({
    valid: z.boolean().optional(),
    error: z.string().optional()
});

const OutputSchema = z.object({
    domain: z.string().optional(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    spf: OutputVerificationDetailSchema.optional(),
    dkim: OutputVerificationDetailSchema.optional(),
    dkim2: OutputVerificationDetailSchema.optional(),
    dmarc: OutputDmarcDetailSchema.optional(),
    verified_at: z.string().optional(),
    valid_signing: z.boolean().optional(),
    verify_txt_key: z.string().optional()
});

const action = createAction({
    description: 'Add a sender domain to the account for SPF/DKIM verification.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/senders/add-sender-domain/
            endpoint: '1.0/senders/add-domain',
            data: {
                domain: input.domain
            },
            retries: 3
        });

        const providerDomain = ProviderSenderDomainSchema.parse(response.data);

        return {
            ...(providerDomain.domain !== undefined && { domain: providerDomain.domain }),
            ...(providerDomain.created_at !== undefined && { created_at: providerDomain.created_at }),
            ...(providerDomain.last_tested_at !== undefined && { last_tested_at: providerDomain.last_tested_at }),
            ...(providerDomain.spf !== undefined && {
                spf: {
                    ...(providerDomain.spf.valid !== undefined && { valid: providerDomain.spf.valid }),
                    ...(providerDomain.spf.valid_after != null && { valid_after: providerDomain.spf.valid_after }),
                    ...(providerDomain.spf.error != null && { error: providerDomain.spf.error })
                }
            }),
            ...(providerDomain.dkim !== undefined && {
                dkim: {
                    ...(providerDomain.dkim.valid !== undefined && { valid: providerDomain.dkim.valid }),
                    ...(providerDomain.dkim.valid_after != null && { valid_after: providerDomain.dkim.valid_after }),
                    ...(providerDomain.dkim.error != null && { error: providerDomain.dkim.error })
                }
            }),
            ...(providerDomain.dkim2 !== undefined && {
                dkim2: {
                    ...(providerDomain.dkim2.valid !== undefined && { valid: providerDomain.dkim2.valid }),
                    ...(providerDomain.dkim2.valid_after != null && { valid_after: providerDomain.dkim2.valid_after }),
                    ...(providerDomain.dkim2.error != null && { error: providerDomain.dkim2.error })
                }
            }),
            ...(providerDomain.dmarc !== undefined && {
                dmarc: {
                    ...(providerDomain.dmarc.valid !== undefined && { valid: providerDomain.dmarc.valid }),
                    ...(providerDomain.dmarc.error != null && { error: providerDomain.dmarc.error })
                }
            }),
            ...(providerDomain.verified_at != null && { verified_at: providerDomain.verified_at }),
            ...(providerDomain.valid_signing !== undefined && { valid_signing: providerDomain.valid_signing }),
            ...(providerDomain.verify_txt_key !== undefined && { verify_txt_key: providerDomain.verify_txt_key })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
