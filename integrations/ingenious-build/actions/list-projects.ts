import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.'),
    per_page: z.number().optional().describe('Number of items per page. Maximum 100.')
});

const ProjectTagSchema = z.object({
    name: z.string()
});

const ProjectEmployeeSchema = z.object({
    manager_id: z.string().nullable().optional(),
    executive_id: z.string().nullable().optional(),
    primary_contact_id: z.string().nullable().optional(),
    secondary_contact_id: z.string().nullable().optional()
});

const ProjectCustomAttributeFieldSchema = z.object({
    id: z.string(),
    value: z
        .union([z.string(), z.number(), z.array(z.string())])
        .nullable()
        .optional()
});

const ProjectCustomAttributeSchema = z.object({
    id: z.string(),
    fields: z.array(ProjectCustomAttributeFieldSchema).optional()
});

const ProjectItemSchema = z.object({
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
    employees: ProjectEmployeeSchema.nullable().optional(),
    client_company_id: z.string().nullable().optional(),
    client_contact_id: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    custom_attributes: z.array(ProjectCustomAttributeSchema).nullable().optional(),
    base_line_start_date: z.string().nullable().optional(),
    base_line_end_date: z.string().nullable().optional(),
    forecasted_start_date: z.string().nullable().optional(),
    forecasted_end_date: z.string().nullable().optional(),
    business_unit_id: z.string().nullable().optional(),
    office_location_id: z.string().nullable().optional(),
    exclusions: z.string().nullable().optional(),
    scope: z.string().nullable().optional(),
    tags: z.array(ProjectTagSchema).optional(),
    accounting_company_id: z.string().nullable().optional(),
    generated_id: z.string(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderResponseSchema = z.object({
    items: z.array(ProjectItemSchema),
    total: z.number(),
    page: z.number(),
    per_page: z.number(),
    first_page_url: z.string().nullable().optional(),
    last_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(ProjectItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List construction/real-estate projects in this workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a positive integer representing the page number'
            });
        }

        const perPage = input.per_page ?? 20;
        if (perPage < 1 || perPage > 100) {
            throw new nango.ActionError({
                type: 'invalid_per_page',
                message: 'per_page must be between 1 and 100'
            });
        }

        const response = await nango.get({
            // https://api.ingenious.build/reference/indexprojectpubv2.md
            endpoint: '/api/v2/pub/projects',
            params: {
                page: String(page),
                per_page: String(perPage)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextCursor = providerResponse.next_page_url != null ? String(page + 1) : undefined;

        return {
            items: providerResponse.items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
