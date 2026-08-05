import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    company_id: z.number().describe('Company ID to mark as a customer. Example: 138551860')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    company_id: z.number(),
    health_score: z.number().nullable().optional(),
    owner_id: z.number().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    company_id: z.number(),
    health_score: z.number().optional(),
    owner_id: z.number().optional()
});

const action = createAction({
    description: 'Mark a company as a customer (creates a Customer record tied to a company, tracking a health score).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/customers',
            data: {
                customer: {
                    company_id: input.company_id
                }
            },
            retries: 3
        });

        const providerCustomer = ProviderCustomerSchema.parse(response.data);

        return {
            id: providerCustomer.id,
            company_id: providerCustomer.company_id,
            ...(providerCustomer.health_score != null && { health_score: providerCustomer.health_score }),
            ...(providerCustomer.owner_id != null && { owner_id: providerCustomer.owner_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
