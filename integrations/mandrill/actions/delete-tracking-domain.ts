import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The tracking domain name to delete. Example: "track.example.com"')
});

const CnameSchema = z.object({
    valid: z.boolean(),
    valid_after: z.string().nullable(),
    error: z.string().nullable()
});

const ProviderTrackingDomainSchema = z.object({
    domain: z.string(),
    created_at: z.string(),
    last_tested_at: z.string(),
    cname: CnameSchema,
    valid_tracking: z.boolean()
});

const OutputSchema = z.object({
    domain: z.string(),
    created_at: z.string(),
    last_tested_at: z.string(),
    cname: z.object({
        valid: z.boolean(),
        valid_after: z.string().optional(),
        error: z.string().optional()
    }),
    valid_tracking: z.boolean()
});

const action = createAction({
    description: 'Delete an unverified tracking domain from the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch We translate expected provider errors (verified domain or missing domain)
        // into typed ActionErrors so callers can distinguish them from generic HTTP failures.
        try {
            response = await nango.post({
                // https://mailchimp.com/developer/transactional/api/urls/delete-tracking-domain/
                endpoint: '/1.3/urls/delete-tracking-domain',
                data: {
                    domain: input.domain
                },
                retries: 1
            });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
                const status = err.status;
                const providerResponse =
                    'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response ? err.response.data : undefined;

                if (status === 403) {
                    throw new nango.ActionError({
                        type: 'verified_domain',
                        message: 'Verified tracking domains cannot be deleted via API and require login confirmation.',
                        domain: input.domain
                    });
                }

                if (status === 404) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: 'Tracking domain not found.',
                        domain: input.domain
                    });
                }

                throw new nango.ActionError({
                    type: 'provider_error',
                    message: `Unexpected provider error: ${status}`,
                    domain: input.domain,
                    providerResponse
                });
            }

            throw err;
        }

        const providerDomain = ProviderTrackingDomainSchema.parse(response.data);

        return {
            domain: providerDomain.domain,
            created_at: providerDomain.created_at,
            last_tested_at: providerDomain.last_tested_at,
            cname: {
                valid: providerDomain.cname.valid,
                ...(providerDomain.cname.valid_after != null && {
                    valid_after: providerDomain.cname.valid_after
                }),
                ...(providerDomain.cname.error != null && {
                    error: providerDomain.cname.error
                })
            },
            valid_tracking: providerDomain.valid_tracking
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
