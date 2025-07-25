import type { NangoAction, ProxyConfiguration, TicketCreate, CreatedTicket } from '../../models.js';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskTicket } from '../types.js';
import { TicketCreateSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: TicketCreate): Promise<CreatedTicket> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: TicketCreateSchema, input });

    const subdomain = await getSubdomain(nango);

    const config: ProxyConfiguration = {
        baseUrlOverride: `https://${subdomain}.zendesk.com`,
        // https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/#create-ticket
        endpoint: '/api/v2/tickets',
        retries: 3,
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
