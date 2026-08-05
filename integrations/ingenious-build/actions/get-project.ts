import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Project unique identifier. Example: "6a71de59f55241acad0cd44e"')
});

const ProviderEmployeeSchema = z.object({
    manager_id: z.string().nullable().optional(),
    executive_id: z.string().nullable().optional(),
    primary_contact_id: z.string().nullable().optional(),
    secondary_contact_id: z.string().nullable().optional()
});

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    phase: z.string().nullable().optional(),
    unit_type: z.string().nullable().optional(),
    status_id: z.number().nullable().optional(),
    status_name: z.string().nullable().optional(),
    health: z.string().nullable().optional(),
    risk: z.string().nullable().optional(),
    financial_health: z.string().nullable().optional(),
    scheduled_health: z.string().nullable().optional(),
    employees: ProviderEmployeeSchema.nullable().optional(),
    client_company_id: z.string().nullable().optional(),
    client_contact_id: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    generated_id: z.string(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    phase: z.string().optional(),
    unit_type: z.string().optional(),
    status_id: z.number().optional(),
    status_name: z.string().optional(),
    health: z.string().optional(),
    risk: z.string().optional(),
    financial_health: z.string().optional(),
    scheduled_health: z.string().optional(),
    employees: z
        .object({
            manager_id: z.string().optional(),
            executive_id: z.string().optional(),
            primary_contact_id: z.string().optional(),
            secondary_contact_id: z.string().optional()
        })
        .optional(),
    client_company_id: z.string().optional(),
    client_contact_id: z.string().optional(),
    currency: z.string().optional(),
    generated_id: z.string(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Get a single project by id',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.ingenious.build/reference/getprojectpubv2
            endpoint: `/api/v2/pub/projects/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found',
                id: input.id
            });
        }

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            ...(project.name != null && { name: project.name }),
            ...(project.type != null && { type: project.type }),
            ...(project.phase != null && { phase: project.phase }),
            ...(project.unit_type != null && { unit_type: project.unit_type }),
            ...(project.status_id != null && { status_id: project.status_id }),
            ...(project.status_name != null && { status_name: project.status_name }),
            ...(project.health != null && { health: project.health }),
            ...(project.risk != null && { risk: project.risk }),
            ...(project.financial_health != null && { financial_health: project.financial_health }),
            ...(project.scheduled_health != null && { scheduled_health: project.scheduled_health }),
            ...(project.employees != null && {
                employees: {
                    ...(project.employees.manager_id != null && { manager_id: project.employees.manager_id }),
                    ...(project.employees.executive_id != null && { executive_id: project.employees.executive_id }),
                    ...(project.employees.primary_contact_id != null && { primary_contact_id: project.employees.primary_contact_id }),
                    ...(project.employees.secondary_contact_id != null && { secondary_contact_id: project.employees.secondary_contact_id })
                }
            }),
            ...(project.client_company_id != null && { client_company_id: project.client_company_id }),
            ...(project.client_contact_id != null && { client_contact_id: project.client_contact_id }),
            ...(project.currency != null && { currency: project.currency }),
            generated_id: project.generated_id,
            created_by: project.created_by,
            created_at: project.created_at,
            updated_at: project.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
