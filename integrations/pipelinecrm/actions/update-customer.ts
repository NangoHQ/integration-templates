import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Customer ID. Example: 1223501'),
    owner_id: z.number().optional().describe('The ID of the owner to assign to this customer.'),
    health_score_description: z.string().optional().describe('Explanation or notes for the health score.')
});

const ProviderCustomerSchema = z.object({
    id: z.number(),
    company_id: z.number().optional(),
    owner: z
        .object({
            id: z.number().optional(),
            full_name: z.string().optional()
        })
        .optional(),
    health_score: z.union([z.string(), z.number()]).nullable().optional(),
    health_score_description: z.string().nullable().optional(),
    days_in_health: z.number().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderCompanySchema = z.object({
    id: z.number(),
    owner_id: z.number().nullable().optional(),
    owner: z
        .object({
            id: z.number().optional(),
            first_name: z.string().optional(),
            last_name: z.string().optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.number(),
    company_id: z.number().optional(),
    owner_id: z.number().optional(),
    owner: z
        .object({
            id: z.number().optional(),
            full_name: z.string().optional()
        })
        .optional(),
    health_score: z.union([z.string(), z.number()]).optional(),
    health_score_description: z.string().optional(),
    days_in_health: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update a customer record (e.g. reassign owner).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: { health_score_description?: string } = {};

        if (input.health_score_description !== undefined) {
            payload.health_score_description = input.health_score_description;
        }

        const response = await nango.put({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `api/v3/customers/${encodeURIComponent(String(input.id))}`,
            data: {
                customer: payload
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Pipeline CRM API.'
            });
        }

        const customer = ProviderCustomerSchema.parse(raw);

        // The customers endpoint does not accept owner_id; ownership lives on the underlying company record.
        let companyOwner: { id?: number; full_name?: string } | undefined;
        if (input.owner_id !== undefined && customer.company_id !== undefined) {
            const companyResponse = await nango.put({
                // https://app.pipelinecrm.com/api/docs/introduction
                endpoint: `api/v3/companies/${encodeURIComponent(String(customer.company_id))}`,
                data: {
                    company: { owner_id: input.owner_id }
                },
                retries: 3
            });

            const company = ProviderCompanySchema.parse(companyResponse.data);
            const ownerId = company.owner?.id ?? company.owner_id ?? undefined;
            const fullName = [company.owner?.first_name, company.owner?.last_name].filter(Boolean).join(' ');
            if (ownerId != null || fullName !== '') {
                companyOwner = {
                    ...(ownerId != null && { id: ownerId }),
                    ...(fullName !== '' && { full_name: fullName })
                };
            }
        }

        // Preserve the customer's existing owner when no reassignment was requested.
        const finalOwner = companyOwner ?? customer.owner;

        return {
            id: customer.id,
            ...(customer.company_id !== undefined && { company_id: customer.company_id }),
            ...(finalOwner?.id != null && { owner_id: finalOwner.id }),
            ...(finalOwner !== undefined && { owner: finalOwner }),
            ...(customer.health_score != null && { health_score: customer.health_score }),
            ...(customer.health_score_description != null && { health_score_description: customer.health_score_description }),
            ...(customer.days_in_health != null && { days_in_health: customer.days_in_health }),
            ...(customer.created_at !== undefined && { created_at: customer.created_at }),
            ...(customer.updated_at !== undefined && { updated_at: customer.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
