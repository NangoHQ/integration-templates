import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Contract internal ID. Example: "6a71df4b92e09607f906dc08"')
});

const ProviderWbs3Schema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    total_value: z.string(),
    cost_code_id: z.string()
});

const ProviderWbs2Schema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    total_value: z.string(),
    cost_code_id: z.string(),
    wbs3: z.array(ProviderWbs3Schema).optional()
});

const ProviderWbs1Schema = z.object({
    id: z.string(),
    name: z.string(),
    total_value: z.string(),
    cost_code_id: z.string(),
    site_id: z.string().nullable().optional(),
    contract_change_id: z.string().nullable().optional(),
    wbs2: z.array(ProviderWbs2Schema).optional()
});

const ProviderContractSchema = z.object({
    id: z.string(),
    generated_id: z.string(),
    custom_id: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    project_id: z.string(),
    contract_holder: z.string(),
    total_value: z.string(),
    vendor_company_id: z.string(),
    vendor_contact_id: z.string(),
    client_company_id: z.string(),
    client_contact_id: z.string(),
    status: z.string(),
    sov_status: z.string(),
    retention: z.number().nullable().optional(),
    effective_date: z.string().nullable().optional(),
    initiation_date: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    wbs1: z.array(ProviderWbs1Schema).optional(),
    accounting_company_id: z.string().nullable().optional(),
    payment_term_id: z.string().nullable().optional(),
    project_sites: z.array(z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    generated_id: z.string(),
    custom_id: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    project_id: z.string(),
    contract_holder: z.string(),
    total_value: z.string(),
    vendor_company_id: z.string(),
    vendor_contact_id: z.string(),
    client_company_id: z.string(),
    client_contact_id: z.string(),
    status: z.string(),
    sov_status: z.string(),
    retention: z.number().optional(),
    effective_date: z.string().optional(),
    initiation_date: z.string().optional(),
    source: z.string().optional(),
    type: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    wbs1: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                total_value: z.string(),
                cost_code_id: z.string(),
                site_id: z.string().optional(),
                contract_change_id: z.string().optional(),
                wbs2: z
                    .array(
                        z.object({
                            id: z.string(),
                            name: z.string().optional(),
                            total_value: z.string(),
                            cost_code_id: z.string(),
                            wbs3: z
                                .array(
                                    z.object({
                                        id: z.string(),
                                        name: z.string().optional(),
                                        total_value: z.string(),
                                        cost_code_id: z.string()
                                    })
                                )
                                .optional()
                        })
                    )
                    .optional()
            })
        )
        .optional(),
    accounting_company_id: z.string().optional(),
    payment_term_id: z.string().optional(),
    project_sites: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Get a single contract by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.ingenious.build/reference/536f2a974c4903ba621bb8b12f6fd1fd.md
            endpoint: `/api/v2/pub/contracts/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contract not found',
                id: input.id
            });
        }

        const contract = ProviderContractSchema.parse(response.data);

        return {
            id: contract.id,
            generated_id: contract.generated_id,
            ...(contract.custom_id != null ? { custom_id: contract.custom_id } : {}),
            name: contract.name,
            ...(contract.description != null ? { description: contract.description } : {}),
            project_id: contract.project_id,
            contract_holder: contract.contract_holder,
            total_value: contract.total_value,
            vendor_company_id: contract.vendor_company_id,
            vendor_contact_id: contract.vendor_contact_id,
            client_company_id: contract.client_company_id,
            client_contact_id: contract.client_contact_id,
            status: contract.status,
            sov_status: contract.sov_status,
            ...(contract.retention != null ? { retention: contract.retention } : {}),
            ...(contract.effective_date != null ? { effective_date: contract.effective_date } : {}),
            ...(contract.initiation_date != null ? { initiation_date: contract.initiation_date } : {}),
            ...(contract.source != null ? { source: contract.source } : {}),
            ...(contract.type != null ? { type: contract.type } : {}),
            created_at: contract.created_at,
            updated_at: contract.updated_at,
            ...(contract.wbs1 !== undefined
                ? {
                      wbs1: contract.wbs1.map((wbs1Item) => ({
                          id: wbs1Item.id,
                          name: wbs1Item.name,
                          total_value: wbs1Item.total_value,
                          cost_code_id: wbs1Item.cost_code_id,
                          ...(wbs1Item.site_id != null ? { site_id: wbs1Item.site_id } : {}),
                          ...(wbs1Item.contract_change_id != null ? { contract_change_id: wbs1Item.contract_change_id } : {}),
                          ...(wbs1Item.wbs2 !== undefined
                              ? {
                                    wbs2: wbs1Item.wbs2.map((wbs2Item) => ({
                                        id: wbs2Item.id,
                                        ...(wbs2Item.name != null ? { name: wbs2Item.name } : {}),
                                        total_value: wbs2Item.total_value,
                                        cost_code_id: wbs2Item.cost_code_id,
                                        ...(wbs2Item.wbs3 !== undefined
                                            ? {
                                                  wbs3: wbs2Item.wbs3.map((wbs3Item) => ({
                                                      id: wbs3Item.id,
                                                      ...(wbs3Item.name != null ? { name: wbs3Item.name } : {}),
                                                      total_value: wbs3Item.total_value,
                                                      cost_code_id: wbs3Item.cost_code_id
                                                  }))
                                              }
                                            : {})
                                    }))
                                }
                              : {})
                      }))
                  }
                : {}),
            ...(contract.accounting_company_id != null ? { accounting_company_id: contract.accounting_company_id } : {}),
            ...(contract.payment_term_id != null ? { payment_term_id: contract.payment_term_id } : {}),
            ...(contract.project_sites != null ? { project_sites: contract.project_sites } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
