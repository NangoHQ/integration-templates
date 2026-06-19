import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (from index). Example: "0"'),
    limit: z.number().optional().describe('Number of records per page. Default: 10, max: 100.'),
    departmentId: z.string().optional().describe('Department ID to filter tickets.'),
    status: z.string().optional().describe('Status to filter tickets. Example: "Open"'),
    modifiedTimeRange: z.string().optional().describe('Time range to filter tickets by modified time. Example: "2024-01-01T00:00:00Z,2024-12-31T23:59:59Z"')
});

const ProviderTicketSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderTicketSchema).optional()
});

const TicketSchema = z.object({
    id: z.string(),
    ticketNumber: z.string().optional(),
    subject: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    departmentId: z.string().optional(),
    contactId: z.string().optional(),
    assigneeId: z.string().optional(),
    channel: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    dueDate: z.string().optional(),
    resolution: z.string().optional(),
    closedTime: z.string().optional(),
    description: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    webUrl: z.string().optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
    productId: z.string().optional(),
    classification: z.string().optional(),
    timeEntryCount: z.string().optional(),
    commentCount: z.string().optional(),
    attachmentCount: z.string().optional(),
    taskCount: z.string().optional(),
    threadCount: z.string().optional(),
    approvalCount: z.string().optional(),
    customerResponseTime: z.string().optional(),
    isSpam: z.boolean().optional(),
    isTrashed: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(TicketSchema),
    next_cursor: z.string().optional()
});

function isNonNullString(value: unknown): value is string {
    return typeof value === 'string' && value !== null;
}

function isNonNullBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean' && value !== null;
}

function isNonNullRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const action = createAction({
    description: 'List tickets.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.tickets.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const from = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(from) || from < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer string.'
            });
        }

        const limit = input.limit ?? 50;
        if (limit < 1 || limit > 100) {
            throw new nango.ActionError({
                type: 'invalid_limit',
                message: 'Limit must be between 1 and 100.'
            });
        }

        // https://desk.zoho.com/DeskAPIDocument
        const response = await nango.get({
            endpoint: '/v1/tickets',
            params: {
                from: from.toString(),
                limit: limit.toString(),
                ...(input.departmentId !== undefined && { departmentId: input.departmentId }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.modifiedTimeRange !== undefined && { modifiedTimeRange: input.modifiedTimeRange })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const tickets = providerResponse.data ?? [];

        const items = tickets.map((ticket) => ({
            id: ticket.id,
            ...(isNonNullString(ticket['ticketNumber']) && { ticketNumber: ticket['ticketNumber'] }),
            ...(isNonNullString(ticket['subject']) && { subject: ticket['subject'] }),
            ...(isNonNullString(ticket['status']) && { status: ticket['status'] }),
            ...(isNonNullString(ticket['priority']) && { priority: ticket['priority'] }),
            ...(isNonNullString(ticket['departmentId']) && { departmentId: ticket['departmentId'] }),
            ...(isNonNullString(ticket['contactId']) && { contactId: ticket['contactId'] }),
            ...(isNonNullString(ticket['assigneeId']) && { assigneeId: ticket['assigneeId'] }),
            ...(isNonNullString(ticket['channel']) && { channel: ticket['channel'] }),
            ...(isNonNullString(ticket['createdTime']) && { createdTime: ticket['createdTime'] }),
            ...(isNonNullString(ticket['modifiedTime']) && { modifiedTime: ticket['modifiedTime'] }),
            ...(isNonNullString(ticket['dueDate']) && { dueDate: ticket['dueDate'] }),
            ...(isNonNullString(ticket['resolution']) && { resolution: ticket['resolution'] }),
            ...(isNonNullString(ticket['closedTime']) && { closedTime: ticket['closedTime'] }),
            ...(isNonNullString(ticket['description']) && { description: ticket['description'] }),
            ...(isNonNullString(ticket['email']) && { email: ticket['email'] }),
            ...(isNonNullString(ticket['phone']) && { phone: ticket['phone'] }),
            ...(isNonNullString(ticket['webUrl']) && { webUrl: ticket['webUrl'] }),
            ...(isNonNullString(ticket['category']) && { category: ticket['category'] }),
            ...(isNonNullString(ticket['subCategory']) && { subCategory: ticket['subCategory'] }),
            ...(isNonNullRecord(ticket['customFields']) && { customFields: ticket['customFields'] }),
            ...(isNonNullString(ticket['productId']) && { productId: ticket['productId'] }),
            ...(isNonNullString(ticket['classification']) && { classification: ticket['classification'] }),
            ...(isNonNullString(ticket['timeEntryCount']) && { timeEntryCount: ticket['timeEntryCount'] }),
            ...(isNonNullString(ticket['commentCount']) && { commentCount: ticket['commentCount'] }),
            ...(isNonNullString(ticket['attachmentCount']) && { attachmentCount: ticket['attachmentCount'] }),
            ...(isNonNullString(ticket['taskCount']) && { taskCount: ticket['taskCount'] }),
            ...(isNonNullString(ticket['threadCount']) && { threadCount: ticket['threadCount'] }),
            ...(isNonNullString(ticket['approvalCount']) && { approvalCount: ticket['approvalCount'] }),
            ...(isNonNullString(ticket['customerResponseTime']) && { customerResponseTime: ticket['customerResponseTime'] }),
            ...(isNonNullBoolean(ticket['isSpam']) && { isSpam: ticket['isSpam'] }),
            ...(isNonNullBoolean(ticket['isTrashed']) && { isTrashed: ticket['isTrashed'] })
        }));

        const nextCursor = tickets.length === limit ? (from + limit).toString() : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
