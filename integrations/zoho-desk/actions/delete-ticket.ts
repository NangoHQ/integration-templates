import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ticket_id: z.string().describe('Ticket ID to delete. Example: "123456789"')
});

const OutputSchema = z.object({
    ticket_id: z.string(),
    success: z.boolean()
});

const ConnectionConfigSchema = z.object({
    extension: z.string().optional()
});

const action = createAction({
    description: 'Delete a ticket',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Desk.tickets.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const connectionConfig = ConnectionConfigSchema.safeParse(connection.connection_config);
        const extension = connectionConfig.success && connectionConfig.data.extension ? connectionConfig.data.extension : 'com';

        const response = await nango.post({
            // https://desk.zoho.com/DeskAPIDocument#Tickets-MoveTicketsToTrash
            endpoint: '/api/v1/tickets/moveToTrash',
            baseUrlOverride: `https://desk.zoho.${extension}`,
            data: {
                ticketIds: [input.ticket_id]
            },
            retries: 3
        });

        if (response.status === 200 || response.status === 204) {
            return {
                ticket_id: input.ticket_id,
                success: true
            };
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: 'Failed to delete ticket',
            status: response.status,
            ticket_id: input.ticket_id
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
