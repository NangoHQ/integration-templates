import { createAction } from "nango";
import type { Post as DiscourseTopic } from '../types.js';

import type { ProxyConfiguration } from "nango";
import { Topic, CreateTopic } from "../models.js";

const action = createAction({
    description: "Create a new topic in discourse",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/topics"
    },

    input: CreateTopic,
    output: Topic,

    exec: async (nango, input): Promise<Topic> => {
        if (!input.title) {
            throw new nango.ActionError({
                message: 'Topic title is required'
            });
        }

        const config: ProxyConfiguration = {
            // https://docs.discourse.org/#tag/Posts/operation/createTopicPostPM
            endpoint: '/posts',
            retries: 3,
            data: input
        };

        const { data } = await nango.post<DiscourseTopic>(config);

        const topic: Topic = {
            id: data.topic_id.toString(),
            name: data.name,
            content: data.raw
        };

        return topic;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
