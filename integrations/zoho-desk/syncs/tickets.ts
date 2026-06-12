import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 50;
const RawTicketSchema = z.object({
    id: z.string(),
    ticketNumber: z.string().nullish(),
    subject: z.string().nullish(),
    description: z.string().nullish(),
    status: z.string().nullish(),
    statusType: z.string().nullish(),
    priority: z.string().nullish(),
    channel: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    contactId: z.string().nullish(),
    accountId: z.string().nullish(),
    departmentId: z.string().nullish(),
    assigneeId: z.string().nullish(),
    teamId: z.string().nullish(),
    createdTime: z.string().nullish(),
    modifiedTime: z.string().nullish(),
    dueDate: z.string().nullish(),
    closedTime: z.string().nullish(),
    webUrl: z.string().nullish(),
    isSpam: z.boolean().nullish(),
    isTrashed: z.boolean().nullish(),
    isDeleted: z.boolean().nullish()
});

const TicketSchema = z.object({
    id: z.string(),
    ticketNumber: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    statusType: z.string().optional(),
    priority: z.string().optional(),
    channel: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    contactId: z.string().optional(),
    accountId: z.string().optional(),
    departmentId: z.string().optional(),
    assigneeId: z.string().optional(),
    teamId: z.string().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    dueDate: z.string().optional(),
    closedTime: z.string().optional(),
    webUrl: z.string().optional(),
    isSpam: z.boolean().optional(),
    isTrashed: z.boolean().optional(),
    isDeleted: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    from: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync tickets.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/tickets'
        }
    ],
    models: {
        Ticket: TicketSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const extension = typeof connection.connection_config?.['extension'] === 'string' ? connection.connection_config['extension'] : 'com';
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = parsedCheckpoint.success ? parsedCheckpoint.data.updated_after || undefined : undefined;
        const startFrom = parsedCheckpoint.success ? parsedCheckpoint.data.from : 1;
        const nowIso = new Date().toISOString();
        let nextFrom: number | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://desk.zoho.com/DeskAPIDocument
            endpoint: '/api/v1/tickets/search',
            baseUrlOverride: `https://desk.zoho.${extension}`,
            params: {
                sortBy: 'modifiedTime',
                ...(updatedAfter && { modifiedTimeRange: `${updatedAfter},${nowIso}` })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: startFrom,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: LIMIT,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    nextFrom = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const tickets: z.infer<typeof TicketSchema>[] = [];
            for (const item of page) {
                const parsed = RawTicketSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse ticket: ${parsed.error.message}`);
                }
                const record = parsed.data;
                tickets.push({
                    id: record.id,
                    ...(record.ticketNumber != null && { ticketNumber: record.ticketNumber }),
                    ...(record.subject != null && { subject: record.subject }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.statusType != null && { statusType: record.statusType }),
                    ...(record.priority != null && { priority: record.priority }),
                    ...(record.channel != null && { channel: record.channel }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.phone != null && { phone: record.phone }),
                    ...(record.contactId != null && { contactId: record.contactId }),
                    ...(record.accountId != null && { accountId: record.accountId }),
                    ...(record.departmentId != null && { departmentId: record.departmentId }),
                    ...(record.assigneeId != null && { assigneeId: record.assigneeId }),
                    ...(record.teamId != null && { teamId: record.teamId }),
                    ...(record.createdTime != null && { createdTime: record.createdTime }),
                    ...(record.modifiedTime != null && { modifiedTime: record.modifiedTime }),
                    ...(record.dueDate != null && { dueDate: record.dueDate }),
                    ...(record.closedTime != null && { closedTime: record.closedTime }),
                    ...(record.webUrl != null && { webUrl: record.webUrl }),
                    ...(record.isSpam != null && { isSpam: record.isSpam }),
                    ...(record.isTrashed != null && { isTrashed: record.isTrashed }),
                    ...(record.isDeleted != null && { isDeleted: record.isDeleted })
                });
            }

            if (tickets.length === 0) {
                if (nextFrom !== undefined) {
                    await nango.saveCheckpoint({
                        updated_after: updatedAfter || '',
                        from: nextFrom
                    });
                }
                continue;
            }

            await nango.batchSave(tickets, 'Ticket');

            if (nextFrom !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    from: nextFrom
                });
            }
        }

        await nango.saveCheckpoint({
            updated_after: nowIso,
            from: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
