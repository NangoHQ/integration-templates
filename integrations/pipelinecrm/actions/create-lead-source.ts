import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the lead source. Example: "Organic Marketing"'),
    cost_per_lead_in_cents: z.number().optional().describe('The price per lead in cents. Example: 500'),
    flat_fee_in_cents: z.number().optional().describe('The flat fee for the leads in cents. Example: 500')
});

const ProviderLeadSourceSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
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
    description: 'Create a new lead source.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: 'api/v3/admin/lead_sources',
            data: {
                lead_source: {
                    name: input.name,
                    ...(input.cost_per_lead_in_cents !== undefined && { cost_per_lead_in_cents: input.cost_per_lead_in_cents }),
                    ...(input.flat_fee_in_cents !== undefined && { flat_fee_in_cents: input.flat_fee_in_cents })
                }
            },
            retries: 3
        });

        const raw = response.data;
        let providerLeadSource: z.infer<typeof ProviderLeadSourceSchema>;

        if (raw && typeof raw === 'object' && 'lead_source' in raw) {
            const wrapper = z
                .object({
                    lead_source: ProviderLeadSourceSchema
                })
                .parse(raw);
            providerLeadSource = wrapper.lead_source;
        } else {
            providerLeadSource = ProviderLeadSourceSchema.parse(raw);
        }

        return {
            id: providerLeadSource.id,
            ...(providerLeadSource.name != null && { name: providerLeadSource.name }),
            ...(providerLeadSource.cost_per_lead_in_cents != null && { cost_per_lead_in_cents: providerLeadSource.cost_per_lead_in_cents }),
            ...(providerLeadSource.flat_fee_in_cents != null && { flat_fee_in_cents: providerLeadSource.flat_fee_in_cents }),
            ...(providerLeadSource.created_at != null && { created_at: providerLeadSource.created_at }),
            ...(providerLeadSource.updated_at != null && { updated_at: providerLeadSource.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
