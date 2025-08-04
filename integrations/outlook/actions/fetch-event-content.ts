import type { NangoAction, ProxyConfiguration, IdEntity, BodyContent } from '../../models';
import type { SingleEventContent } from '../types.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<BodyContent> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Missing required input: id'
        });
    }
    const { id } = input;

    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/user-list-events?view=graph-rest-1.0&tabs=http
        endpoint: `/v1.0/me/events/${id}`,
        params: {
            $select: 'body'
        },
        retries: 3
    };

    const eventResponse = await nango.get<SingleEventContent>(config);

    return eventResponse.data.body;
}
