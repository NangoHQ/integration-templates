import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The sender domain to check. Example: "example.com"')
});

const ProviderResponseSchema = z.object({
    domain: z.string(),
    created_at: z.string().nullable().optional(),
    last_tested_at: z.string().nullable().optional(),
    verified_at: z.string().nullable().optional(),
    valid_signing: z.boolean().nullable().optional(),
    spf: z
        .object({
            valid: z.boolean().nullable().optional(),
            valid_after: z.string().nullable().optional(),
            error: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    dkim: z
        .object({
            valid: z.boolean().nullable().optional(),
            valid_after: z.string().nullable().optional(),
            error: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    verified_at: z.string().optional(),
    valid_signing: z.boolean().optional(),
    spf: z
        .object({
            valid: z.boolean().optional(),
            valid_after: z.string().optional(),
            error: z.string().optional()
        })
        .optional(),
    dkim: z
        .object({
            valid: z.boolean().optional(),
            valid_after: z.string().optional(),
            error: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Check the SPF and DKIM settings for a sender domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/senders/check-domain
            endpoint: 'senders/check-domain.json',
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            data: {
                domain: input.domain
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            domain: providerData.domain,
            ...(providerData.created_at != null && { created_at: providerData.created_at }),
            ...(providerData.last_tested_at != null && { last_tested_at: providerData.last_tested_at }),
            ...(providerData.verified_at != null && { verified_at: providerData.verified_at }),
            ...(providerData.valid_signing != null && { valid_signing: providerData.valid_signing }),
            ...(providerData.spf != null && {
                spf: {
                    ...(providerData.spf.valid != null && { valid: providerData.spf.valid }),
                    ...(providerData.spf.valid_after != null && { valid_after: providerData.spf.valid_after }),
                    ...(providerData.spf.error != null && { error: providerData.spf.error })
                }
            }),
            ...(providerData.dkim != null && {
                dkim: {
                    ...(providerData.dkim.valid != null && { valid: providerData.dkim.valid }),
                    ...(providerData.dkim.valid_after != null && { valid_after: providerData.dkim.valid_after }),
                    ...(providerData.dkim.error != null && { error: providerData.dkim.error })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
