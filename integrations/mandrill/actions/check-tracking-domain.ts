import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    domain: z.string().describe('An existing tracking domain name. Example: "track.example.com"')
});

const CnameSchema = z.object({
    valid: z.boolean(),
    valid_after: z.string().nullable().optional(),
    error: z.string().nullable().optional()
});

const ProviderOutputSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().nullable().optional(),
    cname: CnameSchema,
    valid_tracking: z.boolean().optional()
});

const OutputSchema = z.object({
    domain: z.string(),
    created_at: z.string().optional(),
    last_tested_at: z.string().optional(),
    cname: z.object({
        valid: z.boolean(),
        valid_after: z.string().optional(),
        error: z.string().optional()
    }),
    valid_tracking: z.boolean().optional()
});

const action = createAction({
    description: 'Check the CNAME settings for a tracking domain.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/urls/check-tracking-domain/
            endpoint: '/1.0/urls/check-tracking-domain',
            data: {
                domain: input.domain
            },
            retries: 3
        });

        const providerOutput = ProviderOutputSchema.parse(response.data);

        return {
            domain: providerOutput.domain,
            ...(providerOutput.created_at !== undefined && { created_at: providerOutput.created_at }),
            ...(providerOutput.last_tested_at != null && { last_tested_at: providerOutput.last_tested_at }),
            cname: {
                valid: providerOutput.cname.valid,
                ...(providerOutput.cname.valid_after != null && { valid_after: providerOutput.cname.valid_after }),
                ...(providerOutput.cname.error != null && { error: providerOutput.cname.error })
            },
            ...(providerOutput.valid_tracking !== undefined && { valid_tracking: providerOutput.valid_tracking })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
