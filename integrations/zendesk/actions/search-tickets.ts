import type { NangoAction, SearchTicketInput, SearchTicketOutput, SearchTicket, ProxyConfiguration } from '../../models';
import { toTicket } from '../mappers/toTicket.js';
import type { ZendeskSearchTicketsResponse, ZendeskTicket, ZendeskUser, ZendeskPaginationParams } from '../types';

export default async function runAction(nango: NangoAction, input: SearchTicketInput): Promise<SearchTicketOutput> {
    if (!input.query) {
        throw new nango.ActionError({
            message: 'Search query is required'
        });
    }

    const config = {
        // https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/
        endpoint: `/api/v2/search`,
        params: {
            query: input.query,
            include: 'tickets(users)'
        },
        page_size: 100
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

async function* paginate(
    nango: NangoAction,
    { endpoint, params, page_size }: ZendeskPaginationParams
): AsyncGenerator<{ tickets: ZendeskTicket[]; users: ZendeskUser[] }, void, undefined> {
    let nextPageLink: string | null = endpoint;

    while (nextPageLink) {
        const configParams = {
            per_page: page_size,
            query: params.query,
            include: params.include
        };

        const config: ProxyConfiguration = {
            // https://developer.zendesk.com/api-reference/ticketing/ticket-management/search/
            endpoint: nextPageLink,
            params: configParams,
            retries: 10
        };

        const response = await nango.get<ZendeskSearchTicketsResponse>(config);

        const tickets: ZendeskTicket[] = response.data.results || [];
        const users: ZendeskUser[] = response.data.users || [];

        const moreDataAvailable = !!response.data.next_page;

        yield { tickets, users };

        if (!moreDataAvailable) break;

        nextPageLink = response.data.next_page || null;

        if (nextPageLink) {
            const urlParts = new URL(nextPageLink);
            nextPageLink = `${urlParts.pathname}${urlParts.search}`;
        }
    }
}
