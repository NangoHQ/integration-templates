import { z } from 'zod';
import { createAction } from 'nango';

const RuleSchema = z.object({
    visitor_source_id: z.string().describe('Conversion tag ID string. Example: "2612511566392"'),
    retention_days: z.number().int().min(1).max(540).describe('Retention days as an integer. Example: 180')
});

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    name: z.string().describe('Audience name.'),
    audience_type: z.enum(['VISITOR', 'ENGAGEMENT', 'ACTALIKE', 'CUSTOMER_LIST']).describe('Audience type.'),
    rule: RuleSchema,
    description: z.string().optional().describe('Optional audience description.')
});

const AudienceSchema = z
    .object({
        id: z.string(),
        ad_account_id: z.string(),
        name: z.string(),
        audience_type: z.string(),
        description: z.string().optional(),
        rule: z
            .object({
                visitor_source_id: z.string().optional(),
                retention_days: z.number().optional()
            })
            .passthrough()
            .optional(),
        status: z.string().optional(),
        size: z.number().optional(),
        created_timestamp: z.number().optional(),
        updated_timestamp: z.number().optional()
    })
    .passthrough();

const OutputSchema = AudienceSchema;

const action = createAction({
    description: 'Create an audience.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/audiences/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/audiences`,
            data: {
                name: input.name,
                audience_type: input.audience_type,
                rule: input.rule,
                ...(input.description !== undefined && { description: input.description })
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'The Pinterest API did not return audience data.'
            });
        }

        const audience = AudienceSchema.parse(response.data);
        return audience;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
