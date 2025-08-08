import { createAction } from "nango";
import type { ProxyConfiguration } from "nango";
import { IdEntity, BodyContent } from "../models.js";
import type { SingleEventContent } from '../types.js';

const action = createAction({
    description: "An action used to fetch the contents of an attachment.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/fetch-attachment"
    },

    input: IdEntity,
    output: BodyContent,
    scopes: ["Mail.Read"],

    exec: async (nango, input): Promise<BodyContent> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

