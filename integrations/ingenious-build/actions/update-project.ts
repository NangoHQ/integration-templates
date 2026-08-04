import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('ID of the project to update. Example: "6a71de59f55241acad0cd44e"'),
    custom_id: z.string().nullable().optional().describe('Custom ID of the project. Has to be unique.'),
    name: z.string().optional().describe('Name of the project.'),
    description: z.string().nullable().optional().describe('Description of the project.'),
    status: z
        .enum(['scheduled', 'in-progress', 'completed', 'on-hold', 'cancelled', 'feasibility', 'archived'])
        .nullable()
        .optional()
        .describe('Status of the project.'),
    office_location_id: z.string().nullable().optional().describe('ID of the office location attached to the project.'),
    business_unit_id: z.string().nullable().optional().describe('ID of the business unit attached to the project.'),
    sector: z
        .enum([
            'Commercial',
            'Education',
            'Government',
            'Healthcare',
            'Hospitality',
            'Industrial',
            'Office',
            'Other',
            'Residential',
            'Restaurant',
            'Retail',
            'Schools',
            'Multi-Family'
        ])
        .optional()
        .describe('Sector / Industry of the project.'),
    project_type: z.string().nullable().optional().describe('Name of the existing Project Type.'),
    project_phase_id: z.string().nullable().optional().describe('ID of the project phase attached to the project.')
});

const ProviderProjectSchema = z
    .object({
        id: z.string(),
        custom_id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        type: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        phase: z.string().nullable().optional(),
        unit_type: z.string().nullable().optional(),
        sector: z.string().nullable().optional(),
        status_id: z.number().nullable().optional(),
        status_name: z.string().nullable().optional(),
        health: z.string().nullable().optional(),
        risk: z.string().nullable().optional(),
        financial_health: z.string().nullable().optional(),
        scheduled_health: z.string().nullable().optional(),
        client_company_id: z.string().nullable().optional(),
        client_contact_id: z.string().nullable().optional(),
        currency: z.string().nullable().optional(),
        business_unit_id: z.string().nullable().optional(),
        office_location_id: z.string().nullable().optional(),
        generated_id: z.string(),
        created_by: z.string(),
        created_at: z.string(),
        updated_at: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    custom_id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    phase: z.string().nullable().optional(),
    unit_type: z.string().nullable().optional(),
    sector: z.string().nullable().optional(),
    status_id: z.number().nullable().optional(),
    status_name: z.string().nullable().optional(),
    health: z.string().nullable().optional(),
    risk: z.string().nullable().optional(),
    financial_health: z.string().nullable().optional(),
    scheduled_health: z.string().nullable().optional(),
    client_company_id: z.string().nullable().optional(),
    client_contact_id: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    business_unit_id: z.string().nullable().optional(),
    office_location_id: z.string().nullable().optional(),
    generated_id: z.string(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const action = createAction({
    description: 'Update fields on an existing project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateBody: Record<string, unknown> = {};

        if (input.custom_id !== undefined) {
            updateBody['custom_id'] = input.custom_id;
        }
        if (input.name !== undefined) {
            updateBody['name'] = input.name;
        }
        if (input.description !== undefined) {
            updateBody['description'] = input.description;
        }
        if (input.status !== undefined) {
            updateBody['status'] = input.status;
        }
        if (input.office_location_id !== undefined) {
            updateBody['office_location_id'] = input.office_location_id;
        }
        if (input.business_unit_id !== undefined) {
            updateBody['business_unit_id'] = input.business_unit_id;
        }
        if (input.sector !== undefined) {
            updateBody['sector'] = input.sector;
        }
        if (input.project_type !== undefined) {
            updateBody['project_type'] = input.project_type;
        }
        if (input.project_phase_id !== undefined) {
            updateBody['project_phase_id'] = input.project_phase_id;
        }

        // https://api.ingenious.build/reference/updateprojectpubv2.md
        await nango.patch({
            endpoint: `/api/v2/pub/projects/${encodeURIComponent(input.project_id)}`,
            data: updateBody,
            retries: 1
        });

        // https://api.ingenious.build/reference/getprojectpubv2.md
        const response = await nango.get({
            endpoint: `/api/v2/pub/projects/${encodeURIComponent(input.project_id)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Project not found after update.',
                project_id: input.project_id
            });
        }

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            id: providerProject.id,
            ...(providerProject.custom_id !== undefined && providerProject.custom_id !== null && { custom_id: providerProject.custom_id }),
            ...(providerProject.name !== undefined && providerProject.name !== null && { name: providerProject.name }),
            ...(providerProject.type !== undefined && providerProject.type !== null && { type: providerProject.type }),
            ...(providerProject.description !== undefined && providerProject.description !== null && { description: providerProject.description }),
            ...(providerProject.phase !== undefined && providerProject.phase !== null && { phase: providerProject.phase }),
            ...(providerProject.unit_type !== undefined && providerProject.unit_type !== null && { unit_type: providerProject.unit_type }),
            ...(providerProject.sector !== undefined && providerProject.sector !== null && { sector: providerProject.sector }),
            ...(providerProject.status_id !== undefined && providerProject.status_id !== null && { status_id: providerProject.status_id }),
            ...(providerProject.status_name !== undefined && providerProject.status_name !== null && { status_name: providerProject.status_name }),
            ...(providerProject.health !== undefined && providerProject.health !== null && { health: providerProject.health }),
            ...(providerProject.risk !== undefined && providerProject.risk !== null && { risk: providerProject.risk }),
            ...(providerProject.financial_health !== undefined &&
                providerProject.financial_health !== null && { financial_health: providerProject.financial_health }),
            ...(providerProject.scheduled_health !== undefined &&
                providerProject.scheduled_health !== null && { scheduled_health: providerProject.scheduled_health }),
            ...(providerProject.client_company_id !== undefined &&
                providerProject.client_company_id !== null && { client_company_id: providerProject.client_company_id }),
            ...(providerProject.client_contact_id !== undefined &&
                providerProject.client_contact_id !== null && { client_contact_id: providerProject.client_contact_id }),
            ...(providerProject.currency !== undefined && providerProject.currency !== null && { currency: providerProject.currency }),
            ...(providerProject.business_unit_id !== undefined &&
                providerProject.business_unit_id !== null && { business_unit_id: providerProject.business_unit_id }),
            ...(providerProject.office_location_id !== undefined &&
                providerProject.office_location_id !== null && { office_location_id: providerProject.office_location_id }),
            generated_id: providerProject.generated_id,
            created_by: providerProject.created_by,
            created_at: providerProject.created_at,
            updated_at: providerProject.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
