import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Employee ID. Example: "6a71ddfccb6ddf6b370e09e4"')
});

const CustomAttributeFieldSchema = z.object({
    id: z.string(),
    value: z.union([z.string().nullable(), z.number().nullable(), z.array(z.string()).nullable()]).nullable()
});

const CustomAttributeSchema = z.object({
    id: z.string(),
    fields: z.array(CustomAttributeFieldSchema)
});

const ProjectRolesSchema = z.object({
    primary_project_role_id: z.string().nullable(),
    additional_project_role_ids: z.array(z.string())
});

const ProviderEmployeeSchema = z.object({
    id: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    email: z.string().nullable(),
    company_id: z.string().nullable(),
    company_name: z.string().nullable(),
    account_type_id: z.string().nullable(),
    is_archived: z.boolean().nullable(),
    is_admin: z.boolean().nullable(),
    supervisor_id: z.string().nullable(),
    business_unit: z.string().nullable(),
    project_roles: ProjectRolesSchema.nullable(),
    custom_attributes: z.array(CustomAttributeSchema).nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company_id: z.string().optional(),
    company_name: z.string().optional(),
    account_type_id: z.string().optional(),
    is_archived: z.boolean().optional(),
    is_admin: z.boolean().optional(),
    supervisor_id: z.string().optional(),
    business_unit: z.string().optional(),
    project_roles: z
        .object({
            primary_project_role_id: z.string().optional(),
            additional_project_role_ids: z.array(z.string())
        })
        .optional(),
    custom_attributes: z
        .array(
            z.object({
                id: z.string(),
                fields: z.array(
                    z.object({
                        id: z.string(),
                        value: z.union([z.string().nullable(), z.number().nullable(), z.array(z.string()).nullable()]).nullable()
                    })
                )
            })
        )
        .optional()
});

const action = createAction({
    description: 'Get a single employee by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.ingenious.build/reference/getemployeepubv2
        const response = await nango.get({
            endpoint: `/api/v2/pub/employees/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee not found',
                id: input.id
            });
        }

        const employee = ProviderEmployeeSchema.parse(response.data);

        return {
            id: employee.id,
            ...(employee.first_name != null && { first_name: employee.first_name }),
            ...(employee.last_name != null && { last_name: employee.last_name }),
            ...(employee.email != null && { email: employee.email }),
            ...(employee.company_id != null && { company_id: employee.company_id }),
            ...(employee.company_name != null && { company_name: employee.company_name }),
            ...(employee.account_type_id != null && { account_type_id: employee.account_type_id }),
            ...(employee.is_archived != null && { is_archived: employee.is_archived }),
            ...(employee.is_admin != null && { is_admin: employee.is_admin }),
            ...(employee.supervisor_id != null && { supervisor_id: employee.supervisor_id }),
            ...(employee.business_unit != null && { business_unit: employee.business_unit }),
            ...(employee.project_roles != null && {
                project_roles: {
                    ...(employee.project_roles.primary_project_role_id != null && { primary_project_role_id: employee.project_roles.primary_project_role_id }),
                    additional_project_role_ids: employee.project_roles.additional_project_role_ids
                }
            }),
            ...(employee.custom_attributes != null && { custom_attributes: employee.custom_attributes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
