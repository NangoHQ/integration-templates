import { z } from 'zod';
import { createAction } from 'nango';

const DepartmentSchema = z.object({
    id: z.string().describe('Department ID. Example: "1329983000000006907"'),
    name: z.string().describe('Department name. Example: "NangoDesk"'),
    description: z.string().nullable().optional().describe('Department description'),
    createdTime: z.string().optional().describe('ISO timestamp when the department was created'),
    chatStatus: z.string().optional().describe('Chat status for the department'),
    nameInCustomerPortal: z.string().optional().describe('Name displayed in the customer portal'),
    creatorId: z.string().optional().describe('ID of the user who created the department'),
    isEnabled: z.boolean().optional().describe('Whether the department is enabled'),
    isDefault: z.boolean().optional().describe('Whether this is the default department'),
    isAssignToTeamEnabled: z.boolean().optional().describe('Whether assign to team is enabled'),
    isVisibleInCustomerPortal: z.boolean().optional().describe('Whether visible in customer portal'),
    hasLogo: z.boolean().optional().describe('Whether the department has a logo'),
    sanitizedName: z.string().optional().describe('Sanitized name for URLs')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (maps to `from` offset). Omit for the first page.'),
    limit: z.number().optional().describe('Number of records per page. Default 10, max 50.')
});

const OutputSchema = z.object({
    items: z.array(DepartmentSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page. Omit if no more pages.')
});

const action = createAction({
    description: 'List departments',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-departments',
        group: 'Departments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://desk.zoho.com/DeskAPIDocument
        const response = await nango.get({
            endpoint: '/v1/departments',
            params: {
                ...(input.cursor !== undefined && { from: input.cursor }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const rawData = response.data;
        if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Zoho Desk API'
            });
        }

        const items = rawData.data.map((item: unknown) => {
            const parsed = DepartmentSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse department item',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        const nextFrom = input.cursor !== undefined ? Number(input.cursor) + items.length : 1 + items.length;
        const next_cursor = items.length > 0 ? String(nextFrom) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
