import { z } from 'zod';
import { createAction } from 'nango';

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(DepartmentSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const InputSchema = z
    .object({
        cursor: z.string().uuid().optional().describe('Pagination cursor (`next_cursor`) from the previous response. Omit to start from the first page.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of departments to return per page, between 2 and 100. Defaults to 20.')
    })
    .describe('Filters for listing departments.');

const OutputSchema = z
    .object({
        departments: z
            .array(
                z.object({
                    id: z.string().describe('Unique identifier of the department.'),
                    name: z.string().describe('Name of the department.')
                })
            )
            .describe('Departments returned for the requested page.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as `cursor` to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A single page of departments.');

/**
 * @tags: [read]
 * @tagReason: Reads the provider's department list; no provider state is modified.
 */
const action = createAction({
    description: 'List departments.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['departments:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/overview/introduction
            endpoint: '/developer/v1/departments',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (parsed.page.next !== null) {
            nextCursor = new URL(parsed.page.next).searchParams.get('start') ?? undefined;
        }

        return {
            departments: parsed.data.map((department) => ({
                id: department.id,
                name: department.name
            })),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
