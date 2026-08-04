import { z } from 'zod';
import { createAction } from 'nango';

const CustomAttributeFieldSchema = z.object({
    id: z.string(),
    value: z.union([z.string().nullable(), z.number().nullable(), z.array(z.string()).nullable()]).optional()
});

const CustomAttributeSchema = z.object({
    id: z.string(),
    fields: z.array(CustomAttributeFieldSchema)
});

const ProjectRolesSchema = z.object({
    primary_project_role_id: z.string().nullable().optional(),
    additional_project_role_ids: z.array(z.string())
});

const ProviderEmployeeSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    company_id: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    office_phone: z.string().nullable().optional(),
    cell_phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    secondary_email: z.string().nullable().optional(),
    assigned_office_location_id: z.string().nullable().optional(),
    custom_id: z.string().nullable().optional(),
    custom_attributes: z.array(CustomAttributeSchema),
    supervisor_id: z.string().nullable().optional(),
    business_unit: z.string().nullable().optional(),
    additional_business_units: z.array(z.string()),
    is_archived: z.boolean().nullable().optional(),
    is_admin: z.boolean().nullable().optional(),
    termination_date: z.string().nullable().optional(),
    last_login: z.string().nullable().optional(),
    client_company_ids: z.array(z.string()),
    location_ids: z.array(z.string()),
    project_roles: ProjectRolesSchema,
    account_type_id: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderEmployeeSchema),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional()
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
    custom_attributes: z.array(CustomAttributeSchema),
    supervisor_id: z.string().optional(),
    business_unit: z.string().optional(),
    additional_business_units: z.array(z.string()),
    is_archived: z.boolean().optional(),
    is_admin: z.boolean().optional(),
    last_login: z.string().optional(),
    client_company_ids: z.array(z.string()),
    location_ids: z.array(z.string()),
    project_roles: ProjectRolesSchema,
    account_type_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().min(1).max(100).optional().describe('Number of items per page. Maximum is 100.')
});

const ListOutputSchema = z.object({
    items: z.array(EmployeeSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List employees (internal workspace users) in this workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://api.ingenious.build/reference/indexemployeepubv2.md
        const response = await nango.get({
            endpoint: '/api/v2/pub/employees',
            params: {
                ...(input.cursor !== undefined && { page: input.cursor }),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                id: item.id,
                ...(item.first_name != null && { first_name: item.first_name }),
                ...(item.last_name != null && { last_name: item.last_name }),
                ...(item.company_id != null && { company_id: item.company_id }),
                ...(item.company_name != null && { company_name: item.company_name }),
                ...(item.title != null && { title: item.title }),
                ...(item.office_phone != null && { office_phone: item.office_phone }),
                ...(item.cell_phone != null && { cell_phone: item.cell_phone }),
                ...(item.email != null && { email: item.email }),
                ...(item.assigned_office_location_id != null && { assigned_office_location_id: item.assigned_office_location_id }),
                ...(item.custom_id != null && { custom_id: item.custom_id }),
                custom_attributes: item.custom_attributes,
                ...(item.supervisor_id != null && { supervisor_id: item.supervisor_id }),
                ...(item.business_unit != null && { business_unit: item.business_unit }),
                additional_business_units: item.additional_business_units,
                ...(item.is_archived != null && { is_archived: item.is_archived }),
                ...(item.is_admin != null && { is_admin: item.is_admin }),
                ...(item.last_login != null && { last_login: item.last_login }),
                client_company_ids: item.client_company_ids,
                location_ids: item.location_ids,
                project_roles: {
                    ...(item.project_roles.primary_project_role_id != null && {
                        primary_project_role_id: item.project_roles.primary_project_role_id
                    }),
                    additional_project_role_ids: item.project_roles.additional_project_role_ids
                },
                ...(item.account_type_id != null && { account_type_id: item.account_type_id }),
                created_at: item.created_at,
                updated_at: item.updated_at
            })),
            ...(parsed.next_page_url != null && { next_cursor: String(parsed.page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
