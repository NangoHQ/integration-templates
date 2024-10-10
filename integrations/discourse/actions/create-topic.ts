import type { NangoAction, ProxyConfiguration, Topic, CreateTopic } from '../../models';
import type { Post as DiscourseTopic } from '../types';

export default async function runAction(nango: NangoAction, input: CreateTopic): Promise<Topic> {
    if (!input.title) {
        throw new nango.ActionError({
            message: 'Topic title is required',
        });
    }

    const config: ProxyConfiguration = {
        endpoint: '/posts',
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
