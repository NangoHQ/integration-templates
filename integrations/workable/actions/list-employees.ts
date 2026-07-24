import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z
        .union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)])
        .optional()
        .describe('Number of results per page. Must be exactly 10, 20, 50, or 100. Defaults to 50.'),
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    query: z.string().optional().describe('Search query for firstname, lastname, or email.'),
    order_by: z.string().optional().describe('Sort order. Allowed: division, department.'),
    member_id: z.string().optional().describe('Admin member ID to include draft/inactive employees.')
});

const EmployeeSchema = z
    .object({
        id: z.string(),
        name: z.string().nullish(),
        firstname: z.string().nullish(),
        lastname: z.string().nullish(),
        email: z.string().nullish(),
        job_title: z.string().nullish(),
        department: z.string().nullish(),
        division: z.string().nullish(),
        employment_status: z.string().nullish(),
        state: z.string().nullish()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    total_count: z.number(),
    employees: z.array(z.unknown())
});

const OutputSchema = z.object({
    employees: z.array(EmployeeSchema),
    total_count: z.number(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List HR employee records.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 50;
        const parsedCursor = input.cursor ? parseInt(input.cursor, 10) : 0;
        const offset = Number.isNaN(parsedCursor) ? 0 : parsedCursor;

        const response = await nango.get({
            // https://workable.readme.io/reference/employees
            endpoint: '/spi/v3/employees',
            params: {
                limit,
                offset,
                ...(input.query && { query: input.query }),
                ...(input.order_by && { order_by: input.order_by }),
                ...(input.member_id && { member_id: input.member_id })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const employees = providerData.employees.map((raw) => EmployeeSchema.parse(raw));

        const nextOffset = offset + employees.length;
        const hasMore = nextOffset < providerData.total_count;

        return {
            employees,
            total_count: providerData.total_count,
            ...(hasMore && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
