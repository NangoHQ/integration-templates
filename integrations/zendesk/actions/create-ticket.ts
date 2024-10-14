import type { NangoAction, ProxyConfiguration, TicketCreate, CreatedTicket } from '../../models';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskTicket } from '../types';
import { TicketCreateSchema } from '../overrides/schema.js';

export default async function runAction(nango: NangoAction, input: TicketCreate): Promise<CreatedTicket> {
    const parsedInput = TicketCreateSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a ticket: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a ticket'
        });
    }

    const subdomain = await getSubdomain(nango);

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#create-ticket
        endpoint: '/api/v2/tickets',
        retries: 10,
        data: parsedInput.data
    };

    const response = await nango.post<{ ticket: ZendeskTicket }>(config);

    const { data } = response;

    const ticket: CreatedTicket = {
        id: data.ticket.id.toString(),
        url: data.ticket.url,
        created_at: data.ticket.created_at,
        updated_at: data.ticket.updated_at,
        subject: data.ticket.subject,
        description: data.ticket.description,
        priority: data.ticket.priority,
        status: data.ticket.status
    };

    return ticket;
}
