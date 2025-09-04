import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { TopicStatusUpdated, TopicStatus } from '../models.js';

const action = createAction({
    description: 'Update the status of a topic',
    version: '2.0.0',

    endpoint: {
        method: 'PUT',
        path: '/topics/status'
    },

    input: TopicStatus,
    output: TopicStatusUpdated,

    exec: async (nango, input): Promise<TopicStatusUpdated> => {
        if (!input.id) {
            throw new nango.ActionError({
                message: 'Topic id is required'
            });
        }

        if (!input.status) {
            throw new nango.ActionError({
                message: 'Topic status is required'
            });
        }

        if (!input.enabled) {
            throw new nango.ActionError({
                message: 'Topic enabled is required'
            });
        }

        const { id, ...rest } = input;

        const config: ProxyConfiguration = {
            // https://docs.discourse.org/#tag/Topics/operation/updateTopicStatus
            endpoint: `/t/${id}/status`,
            retries: 3,
            data: rest
        };

        const response = await nango.put(config);

        const { data } = response;

        return {
            success: data.success,
            result: data.topic_status_update
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
