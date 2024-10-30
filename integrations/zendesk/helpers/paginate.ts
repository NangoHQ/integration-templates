import type { NangoAction, ProxyConfiguration } from '../../models';
import type { ZendeskSearchTicketsResponse, ZendeskTicket, ZendeskUser } from '../types';

interface RequestParams {
    query: string;
    include: string;
}

interface ZendeskPaginationParams {
    endpoint: string;
    params: RequestParams;
    page_size: number;
}

export async function* paginate(
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
