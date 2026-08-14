import { z } from 'zod';
import { createAction } from 'nango';

const ProjectRolesSchema = z.object({
    primary_project_role_id: z.string().nullable().optional(),
    additional_project_role_ids: z.array(z.string()).nullable().optional()
});

const InputSchema = z.object({
    id: z.string().describe('The Employee primary identifier. Example: "6a71ddfccb6ddf6b370e09e4"'),
    first_name: z.string().nullable().optional().describe('First name of the Employee'),
    last_name: z.string().nullable().optional().describe('Last name of the Employee'),
    custom_id: z.string().nullable().optional().describe('Custom id of the Employee'),
    email: z.string().nullable().optional().describe('Email address of the Employee'),
    title: z.string().nullable().optional().describe('Title of the Employee'),
    date_hired: z.string().nullable().optional().describe('Date hired in Y-m-d format'),
    supervisor_id: z.string().nullable().optional().describe('Supervisor id'),
    business_unit_id: z.string().nullable().optional().describe('Business unit id'),
    office_location_id: z.string().nullable().optional().describe('Assigned office location id'),
    client_company_ids: z.array(z.string()).nullable().optional().describe('Array of company IDs'),
    location_ids: z.array(z.string()).nullable().optional().describe('Array of location IDs'),
    project_roles: ProjectRolesSchema.nullable().optional(),
    account_type_id: z.string().nullable().optional().describe('The account type id of the Employee')
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
    custom_attributes: z.array(z.record(z.string(), z.unknown())).optional(),
    supervisor_id: z.string().nullable().optional(),
    business_unit: z.string().nullable().optional(),
    additional_business_units: z.array(z.string()).optional(),
    is_archived: z.boolean().nullable().optional(),
    is_admin: z.boolean().nullable().optional(),
    termination_date: z.string().nullable().optional(),
    last_login: z.string().nullable().optional(),
    client_company_ids: z.array(z.string()).optional(),
    location_ids: z.array(z.string()).optional(),
    project_roles: z
        .object({
            primary_project_role_id: z.string().nullable().optional(),
            additional_project_role_ids: z.array(z.string()).optional()
        })
        .optional(),
    account_type_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    company_id: z.string().optional(),
    company_name: z.string().optional(),
    title: z.string().optional(),
    office_phone: z.string().optional(),
    cell_phone: z.string().optional(),
    email: z.string().optional(),
    secondary_email: z.string().optional(),
    assigned_office_location_id: z.string().optional(),
    custom_id: z.string().optional(),
    supervisor_id: z.string().optional(),
    business_unit: z.string().optional(),
    additional_business_units: z.array(z.string()).optional(),
    is_archived: z.boolean().optional(),
    is_admin: z.boolean().optional(),
    last_login: z.string().optional(),
    client_company_ids: z.array(z.string()).optional(),
    location_ids: z.array(z.string()).optional(),
    project_roles: z
        .object({
            primary_project_role_id: z.string().optional(),
            additional_project_role_ids: z.array(z.string()).optional()
        })
        .optional(),
    account_type_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update fields on an existing employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['pub:employees:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const patchBody: Record<string, unknown> = {};

        if (input.first_name !== undefined) {
            patchBody['first_name'] = input.first_name;
        }
        if (input.last_name !== undefined) {
            patchBody['last_name'] = input.last_name;
        }
        if (input.custom_id !== undefined) {
            patchBody['custom_id'] = input.custom_id;
        }
        if (input.email !== undefined) {
            patchBody['email'] = input.email;
        }
        if (input.title !== undefined) {
            patchBody['title'] = input.title;
        }
        if (input.date_hired !== undefined) {
            patchBody['date_hired'] = input.date_hired;
        }
        if (input.supervisor_id !== undefined) {
            patchBody['supervisor_id'] = input.supervisor_id;
        }
        if (input.business_unit_id !== undefined) {
            patchBody['business_unit_id'] = input.business_unit_id;
        }
        if (input.office_location_id !== undefined) {
            patchBody['office_location_id'] = input.office_location_id;
        }
        if (input.client_company_ids !== undefined) {
            patchBody['client_company_ids'] = input.client_company_ids;
        }
        if (input.location_ids !== undefined) {
            patchBody['location_ids'] = input.location_ids;
        }
        if (input.project_roles !== undefined) {
            patchBody['project_roles'] = input.project_roles;
        }
        if (input.account_type_id !== undefined) {
            patchBody['account_type_id'] = input.account_type_id;
        }

        // https://api.ingenious.build/reference/patchemployeespubv2.md
        await nango.patch({
            endpoint: `/api/v2/pub/employees/${encodeURIComponent(input.id)}`,
            data: patchBody,
            retries: 10
        });

        // https://api.ingenious.build/reference/getemployeepubv2.md
        const response = await nango.get({
            endpoint: `/api/v2/pub/employees/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee not found after update',
                id: input.id
            });
        }

        const providerEmployee = ProviderEmployeeSchema.parse(response.data);

        return {
            id: providerEmployee.id,
            ...(providerEmployee.first_name != null && { first_name: providerEmployee.first_name }),
            ...(providerEmployee.last_name != null && { last_name: providerEmployee.last_name }),
            ...(providerEmployee.company_id != null && { company_id: providerEmployee.company_id }),
            ...(providerEmployee.company_name != null && { company_name: providerEmployee.company_name }),
            ...(providerEmployee.title != null && { title: providerEmployee.title }),
            ...(providerEmployee.office_phone != null && { office_phone: providerEmployee.office_phone }),
            ...(providerEmployee.cell_phone != null && { cell_phone: providerEmployee.cell_phone }),
            ...(providerEmployee.email != null && { email: providerEmployee.email }),
            ...(providerEmployee.secondary_email != null && { secondary_email: providerEmployee.secondary_email }),
            ...(providerEmployee.assigned_office_location_id != null && { assigned_office_location_id: providerEmployee.assigned_office_location_id }),
            ...(providerEmployee.custom_id != null && { custom_id: providerEmployee.custom_id }),
            ...(providerEmployee.supervisor_id != null && { supervisor_id: providerEmployee.supervisor_id }),
            ...(providerEmployee.business_unit != null && { business_unit: providerEmployee.business_unit }),
            ...(providerEmployee.additional_business_units != null && { additional_business_units: providerEmployee.additional_business_units }),
            ...(providerEmployee.is_archived != null && { is_archived: providerEmployee.is_archived }),
            ...(providerEmployee.is_admin != null && { is_admin: providerEmployee.is_admin }),
            ...(providerEmployee.last_login != null && { last_login: providerEmployee.last_login }),
            ...(providerEmployee.client_company_ids != null && { client_company_ids: providerEmployee.client_company_ids }),
            ...(providerEmployee.location_ids != null && { location_ids: providerEmployee.location_ids }),
            ...(providerEmployee.project_roles != null && {
                project_roles: {
                    ...(providerEmployee.project_roles.primary_project_role_id != null && {
                        primary_project_role_id: providerEmployee.project_roles.primary_project_role_id
                    }),
                    ...(providerEmployee.project_roles.additional_project_role_ids != null && {
                        additional_project_role_ids: providerEmployee.project_roles.additional_project_role_ids
                    })
                }
            }),
            ...(providerEmployee.account_type_id != null && { account_type_id: providerEmployee.account_type_id }),
            ...(providerEmployee.created_at != null && { created_at: providerEmployee.created_at }),
            ...(providerEmployee.updated_at != null && { updated_at: providerEmployee.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
