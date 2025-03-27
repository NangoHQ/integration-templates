import type { NangoAction, ProxyConfiguration, TopicStatusUpdated, TopicStatus } from '../../models';

export default async function runAction(nango: NangoAction, input: TopicStatus): Promise<TopicStatusUpdated> {
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
        endpoint: `/t/${input.id}/status`,
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
