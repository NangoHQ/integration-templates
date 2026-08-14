import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEmployeeSchema = z.object({
    id: z.string(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    company_id: z.string().nullish(),
    company_name: z.string().nullish(),
    title: z.string().nullish(),
    office_phone: z.string().nullish(),
    cell_phone: z.string().nullish(),
    email: z.string().nullish(),
    assigned_office_location_id: z.string().nullish(),
    custom_id: z.string().nullish(),
    supervisor_id: z.string().nullish(),
    business_unit: z.string().nullish(),
    additional_business_units: z.array(z.string()).optional().default([]),
    is_archived: z.boolean().nullish(),
    is_admin: z.boolean().nullish(),
    last_login: z.string().nullish(),
    client_company_ids: z.array(z.string()).optional().default([]),
    location_ids: z.array(z.string()).optional().default([]),
    project_roles: z
        .object({
            primary_project_role_id: z.string().nullish(),
            additional_project_role_ids: z.array(z.string()).optional().default([])
        })
        .optional(),
    account_type_id: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string()
});

const EmployeeSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_id: z.string().optional(),
    company_name: z.string().optional(),
    title: z.string().optional(),
    office_phone: z.string().optional(),
    cell_phone: z.string().optional(),
    email: z.string().optional(),
    assigned_office_location_id: z.string().optional(),
    custom_id: z.string().optional(),
    supervisor_id: z.string().optional(),
    business_unit: z.string().optional(),
    additional_business_units: z.array(z.string()),
    is_archived: z.boolean().optional(),
    is_admin: z.boolean().optional(),
    last_login: z.string().optional(),
    client_company_ids: z.array(z.string()),
    location_ids: z.array(z.string()),
    project_roles: z
        .object({
            primary_project_role_id: z.string().optional(),
            additional_project_role_ids: z.array(z.string())
        })
        .optional(),
    account_type_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync employee (internal user) records in this workspace.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Employee: EmployeeSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = checkpoint && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;

        // Blocker: no viable incremental/changed-since filter confirmed live for this list endpoint.
        // Resume the current full refresh by checkpointing the next page. Delete tracking is
        // started only once the first page has been fetched and validated (below), so a failure
        // on the very first request never leaves delete tracking started with nothing enumerated.
        let deletesStarted = false;

        // https://api.ingenious.build/reference/indexemployeepubv2.md
        const proxyConfig: ProxyConfiguration = {
            // https://api.ingenious.build/reference/indexemployeepubv2.md
            endpoint: '/api/v2/pub/employees',
            params: {
                show_archived: 'true'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const employees = page.map((item) => {
                const record = ProviderEmployeeSchema.parse(item);

                return {
                    id: record.id,
                    ...(record.first_name != null && { first_name: record.first_name }),
                    ...(record.last_name != null && { last_name: record.last_name }),
                    ...(record.company_id != null && { company_id: record.company_id }),
                    ...(record.company_name != null && { company_name: record.company_name }),
                    ...(record.title != null && { title: record.title }),
                    ...(record.office_phone != null && { office_phone: record.office_phone }),
                    ...(record.cell_phone != null && { cell_phone: record.cell_phone }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.assigned_office_location_id != null && { assigned_office_location_id: record.assigned_office_location_id }),
                    ...(record.custom_id != null && { custom_id: record.custom_id }),
                    ...(record.supervisor_id != null && { supervisor_id: record.supervisor_id }),
                    ...(record.business_unit != null && { business_unit: record.business_unit }),
                    additional_business_units: record.additional_business_units,
                    ...(record.is_archived != null && { is_archived: record.is_archived }),
                    ...(record.is_admin != null && { is_admin: record.is_admin }),
                    ...(record.last_login != null && { last_login: record.last_login }),
                    client_company_ids: record.client_company_ids,
                    location_ids: record.location_ids,
                    ...(record.project_roles != null && {
                        project_roles: {
                            ...(record.project_roles.primary_project_role_id != null && {
                                primary_project_role_id: record.project_roles.primary_project_role_id
                            }),
                            additional_project_role_ids: record.project_roles.additional_project_role_ids
                        }
                    }),
                    ...(record.account_type_id != null && { account_type_id: record.account_type_id }),
                    created_at: record.created_at,
                    updated_at: record.updated_at
                };
            });

            if (!deletesStarted) {
                await nango.trackDeletesStart('Employee');
                deletesStarted = true;
            }

            if (employees.length > 0) {
                await nango.batchSave(employees, 'Employee');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();

        if (deletesStarted) {
            await nango.trackDeletesEnd('Employee');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
