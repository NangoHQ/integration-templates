import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Lead source ID. Example: 3627031'),
    name: z.string().optional(),
    cost_per_lead_in_cents: z.number().optional(),
    flat_fee_in_cents: z.number().optional()
});

const ProviderLeadSourceSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    cost_per_lead_in_cents: z.number().nullable().optional(),
    flat_fee_in_cents: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    cost_per_lead_in_cents: z.number().optional(),
    flat_fee_in_cents: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update a lead source.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const leadSourceData: {
            name?: string;
            cost_per_lead_in_cents?: number;
            flat_fee_in_cents?: number;
        } = {};

        if (input.name !== undefined) {
            leadSourceData.name = input.name;
        }
        if (input.cost_per_lead_in_cents !== undefined) {
            leadSourceData.cost_per_lead_in_cents = input.cost_per_lead_in_cents;
        }
        if (input.flat_fee_in_cents !== undefined) {
            leadSourceData.flat_fee_in_cents = input.flat_fee_in_cents;
        }

        const response = await nango.put({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/admin/lead_sources/${encodeURIComponent(String(input.id))}`,
            data: { lead_source: leadSourceData },
            retries: 3
        });

        const leadSource = ProviderLeadSourceSchema.parse(response.data);
        return {
            id: leadSource.id,
            ...(leadSource.name != null && { name: leadSource.name }),
            ...(leadSource.cost_per_lead_in_cents != null && { cost_per_lead_in_cents: leadSource.cost_per_lead_in_cents }),
            ...(leadSource.flat_fee_in_cents != null && { flat_fee_in_cents: leadSource.flat_fee_in_cents }),
            ...(leadSource.created_at != null && { created_at: leadSource.created_at }),
            ...(leadSource.updated_at != null && { updated_at: leadSource.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
