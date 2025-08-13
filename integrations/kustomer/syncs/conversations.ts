import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { KustomerConversation } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Retrieves a paginated list of conversations for the organization',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/kustomer/conversations'
        }
    ],

    scopes: ['org.user.conversation.read', 'org.permission.conversation.read'],

    models: {
        KustomerConversation: KustomerConversation
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://developer.kustomer.com/kustomer-api-docs/reference/getconversations
            endpoint: '/v1/conversations',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                limit_name_in_request: 'pageSize',
                response_path: 'data',
                limit: 100
            }
        };
        for await (const conversation of nango.paginate(config)) {
            const mappedConversation: KustomerConversation[] = conversation.map(mapConversation) || [];
            await nango.batchSave(mappedConversation, 'KustomerConversation');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapConversation(conversation: any): KustomerConversation {
    return {
        type: conversation.type,
        id: conversation.id,
        attributes: conversation.attributes,
        relationships: conversation.relationships,
        links: conversation.links
    };
}
