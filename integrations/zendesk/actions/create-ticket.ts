import type { NangoAction, ProxyConfiguration, TicketCreate, CreatedTicket } from '../../models';
import { getSubdomain } from '../helpers/get-subdomain.js';
import type { ZendeskTicket } from '../types';
import { TicketCreateSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: TicketCreate): Promise<CreatedTicket> {
    nango.zodValidateInput({ zodSchema: TicketCreateSchema, input });

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
