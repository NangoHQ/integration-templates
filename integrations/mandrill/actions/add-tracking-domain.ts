import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('The tracking domain to add. Example: "tracking.example.com"')
});

const CnameSchema = z.object({
    valid: z.boolean(),
    valid_after: z.string().nullable().optional(),
    error: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    cname: CnameSchema.optional(),
    valid_tracking: z.boolean().optional()
});

const OutputSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    cname: z
        .object({
            valid: z.boolean(),
            valid_after: z.string().optional(),
            error: z.string().optional()
        })
        .optional(),
    valid_tracking: z.boolean().optional()
});

const action = createAction({
    description: 'Add a click/open-tracking domain to the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/urls/add-tracking-domain/
            endpoint: '1.0/urls/add-tracking-domain.json',
            data: {
                domain: input.domain
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            domain: providerData.domain,
            ...(providerData.created_at !== undefined && { created_at: providerData.created_at }),
            ...(providerData.last_tested_at !== undefined && { last_tested_at: providerData.last_tested_at }),
            ...(providerData.cname !== undefined && {
                cname: {
                    valid: providerData.cname.valid,
                    ...(providerData.cname.valid_after != null && { valid_after: providerData.cname.valid_after }),
                    ...(providerData.cname.error != null && { error: providerData.cname.error })
                }
            }),
            ...(providerData.valid_tracking !== undefined && { valid_tracking: providerData.valid_tracking })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
