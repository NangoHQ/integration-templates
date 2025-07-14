import type { NangoSync, KustomerConversation } from '../../models.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const endpoint = '/v1/conversations';
    const config = {
        paginate: {
            type: 'link',
            link_path_in_response_body: 'links.next',
            limit_name_in_request: 'pageSize',
            response_path: 'data',
            limit: 100
        }
    };
    for await (const conversation of nango.paginate({ ...config, endpoint })) {
        const mappedConversation: KustomerConversation[] = conversation.map(mapConversation) || [];
        await nango.batchSave(mappedConversation, 'KustomerConversation');
    }
}

function mapConversation(conversation: any): KustomerConversation {
    return {
        type: conversation.type,
        id: conversation.id,
        attributes: conversation.attributes,
        relationships: conversation.relationships,
        links: conversation.links
    };
}
