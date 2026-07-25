import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The domain to delete. Example: "example.com"')
});

const ProviderDkimSpfSchema = z.object({
    error: z.string().nullable().optional(),
    valid: z.boolean().nullable().optional(),
    valid_after: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    created_at: z.string().optional(),
    domain: z.string(),
    dkim: ProviderDkimSpfSchema.nullable().optional(),
    last_tested_at: z.string().nullable().optional(),
    spf: ProviderDkimSpfSchema.nullable().optional(),
    valid_signing: z.boolean().nullable().optional(),
    verified_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    created_at: z.string().optional(),
    domain: z.string(),
    dkim: z
        .object({
            error: z.string().optional(),
            valid: z.boolean().optional(),
            valid_after: z.string().optional()
        })
        .optional(),
    last_tested_at: z.string().optional(),
    spf: z
        .object({
            error: z.string().optional(),
            valid: z.boolean().optional(),
            valid_after: z.string().optional()
        })
        .optional(),
    valid_signing: z.boolean().optional(),
    verified_at: z.string().optional()
});

const action = createAction({
    description: 'Delete an unverified sender domain from the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/senders/delete-domain/
            baseUrlOverride: 'https://mandrillapp.com/api/1.3/',
            endpoint: 'senders/delete-domain.json',
            data: {
                domain: input.domain
            },
            retries: 3
        });

        if (response.data && typeof response.data === 'object' && 'status' in response.data && response.data.status === 'error') {
            const error = z
                .object({
                    status: z.literal('error'),
                    code: z.number(),
                    name: z.string(),
                    message: z.string()
                })
                .parse(response.data);

            throw new nango.ActionError({
                type: 'provider_error',
                message: error.message,
                code: error.code,
                name: error.name
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            domain: providerResponse.domain,
            ...(providerResponse.created_at != null && { created_at: providerResponse.created_at }),
            ...(providerResponse.dkim != null && {
                dkim: {
                    ...(providerResponse.dkim.error != null && { error: providerResponse.dkim.error }),
                    ...(providerResponse.dkim.valid != null && { valid: providerResponse.dkim.valid }),
                    ...(providerResponse.dkim.valid_after != null && { valid_after: providerResponse.dkim.valid_after })
                }
            }),
            ...(providerResponse.last_tested_at != null && { last_tested_at: providerResponse.last_tested_at }),
            ...(providerResponse.spf != null && {
                spf: {
                    ...(providerResponse.spf.error != null && { error: providerResponse.spf.error }),
                    ...(providerResponse.spf.valid != null && { valid: providerResponse.spf.valid }),
                    ...(providerResponse.spf.valid_after != null && { valid_after: providerResponse.spf.valid_after })
                }
            }),
            ...(providerResponse.valid_signing != null && { valid_signing: providerResponse.valid_signing }),
            ...(providerResponse.verified_at != null && { verified_at: providerResponse.verified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
