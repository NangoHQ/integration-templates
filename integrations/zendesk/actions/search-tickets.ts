import type { NangoAction, SearchTicketInput, SearchTicketOutput, SearchTicket, ProxyConfiguration } from '../../models';
import { toTicket } from '../mappers/toTicket.js';
import { paginate } from '../helpers/paginate.js';

export default async function runAction(nango: NangoAction, input: SearchTicketInput): Promise<SearchTicketOutput> {
    if (!input.query) {
        throw new nango.ActionError({
            message: 'Search query is required'
        });
    }

    const params = {
        query: input.query,
        include: 'tickets(users)'
    };

    const config: ProxyConfiguration = {
        endpoint: `/api/v2/search`,
        params: params,
        page_size: 1
    };

    const tickets: SearchTicket[] = [];

    // https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/#query-basics
    for await (const { tickets: pagedTickets, users: pagedUsers } of paginate(nango, config)) {
        const mappedTickets = await Promise.all(pagedTickets.map((ticket) => toTicket(ticket, pagedUsers)));
        tickets.push(...mappedTickets);
    }

    return {
        tickets
    };
}
