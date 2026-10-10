import { z } from 'zod';
import { createAction } from 'nango';

const ProjectSchema = z.object({
    project_id: z.string().describe('Unique identifier of the project. Example: "260815000000165042"'),
    project_name: z.string().optional().describe('Name of the project.'),
    project_code: z.string().optional().describe('Project code, if one has been set.'),
    customer_id: z.string().optional().describe('Unique ID of the customer the project is billed to.'),
    customer_name: z.string().optional().describe('Name of the customer the project is billed to.'),
    description: z.string().optional().describe('Short description of the project.'),
    can_be_invoiced: z.boolean().optional().describe('Whether the project can be invoiced.'),
    status: z.string().optional().describe('Project status, e.g. "active" or "inactive".'),
    billing_type: z.string().optional().describe('How the project is billed, e.g. "fixed_cost_for_project".'),
    rate: z.number().optional().describe('Hourly or total rate configured for the project.'),
    created_time: z.string().optional().describe('Time the project was created, in ISO-8601 format.'),
    last_modified_time: z.string().optional().describe('Time the project was last modified, in ISO-8601 format.'),
    has_attachment: z.boolean().optional().describe('Whether the project has an attachment.'),
    total_hours: z.string().optional().describe('Total hours spent on the project, formatted as HH:MM.'),
    billable_hours: z.string().optional().describe('Billable hours spent on the project, formatted as HH:MM.'),
    other_service_app_source: z.string().optional().describe('Source app for other services associated with the project.'),
    users_working: z.number().optional().describe('Number of users currently working on the project.'),
    custom_fields: z.array(z.unknown()).optional().describe('Custom fields configured for the project.')
});

const PageContextSchema = z.object({
    page: z.number().optional().describe('Current page number.'),
    per_page: z.number().optional().describe('Number of records returned per page.'),
    has_more_page: z.boolean().optional().describe('Whether more pages of projects are available.'),
    report_name: z.string().optional().describe('Name of the report backing the list.'),
    applied_filter: z.string().optional().describe('Status filter applied to the list.'),
    sort_column: z.string().optional().describe('Column the list is sorted by.'),
    sort_order: z.string().optional().describe('Sort direction, "A" for ascending or "D" for descending.'),
    custom_fields: z.array(z.unknown()).optional().describe('Custom fields included in the page context.')
});

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .describe(
                "ID of the Zoho Invoice organization to list projects for. Required on every call; it cannot be discovered through this connection's scopes."
            ),
        last_modified_time: z
            .string()
            .optional()
            .describe('Only return projects modified at or after this ISO-8601 timestamp, e.g. "2026-10-01T00:00:00+0000".'),
        filter_by: z.enum(['Status.All', 'Status.Active', 'Status.Inactive']).optional().describe('Filter projects by status. Defaults to "Status.All".'),
        customer_id: z.string().optional().describe('Only return projects billed to this customer ID.'),
        sort_column: z.enum(['project_name', 'customer_name', 'rate', 'created_time']).optional().describe('Column to sort projects by.'),
        page: z.number().int().positive().optional().describe('Page number to fetch, starting at 1. Defaults to 1.'),
        per_page: z.number().int().positive().optional().describe('Number of projects to return per page. Defaults to 200.')
    })
    .describe('Filters for listing projects in a Zoho Invoice organization.');

const OutputSchema = z
    .object({
        projects: z.array(ProjectSchema).describe('Projects returned for the requested page.'),
        page_context: PageContextSchema.optional().describe('Pagination and sorting metadata for the returned page.'),
        next_page: z.number().optional().describe('Page number to request next; present only when more pages are available.')
    })
    .describe('A page of Zoho Invoice projects plus pagination metadata.');

/**
 * @tags: [read]
 * @tagReason: Reads the organization's projects from Zoho Invoice without modifying provider data.
 * @pitfalls: organization_id is required and cannot be looked up with this connection's scopes, so callers must supply it; results are paginated (default 200 per page), so follow next_page while has_more_page is true or you will silently receive only the first page.
 */
const action = createAction({
    description: 'List projects, with incremental last_modified_time filtering.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInvoice.projects.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.zoho.com/invoice/api/v3/projects/#list-projects
            endpoint: '/invoice/v3/projects',
            params: {
                organization_id: input.organization_id,
                ...(input.last_modified_time !== undefined && { last_modified_time: input.last_modified_time }),
                ...(input.filter_by !== undefined && { filter_by: input.filter_by }),
                ...(input.customer_id !== undefined && { customer_id: input.customer_id }),
                ...(input.sort_column !== undefined && { sort_column: input.sort_column }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        const parsed = z
            .object({
                code: z.number(),
                message: z.string().optional(),
                projects: z.array(ProjectSchema),
                page_context: PageContextSchema.optional()
            })
            .parse(response.data);

        const currentPage = parsed.page_context?.page ?? input.page ?? 1;
        const hasMorePage = parsed.page_context?.has_more_page === true;

        return {
            projects: parsed.projects,
            ...(parsed.page_context !== undefined && { page_context: parsed.page_context }),
            ...(hasMorePage && { next_page: currentPage + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
