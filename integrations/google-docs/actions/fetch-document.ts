import type { NangoAction, ProxyConfiguration, DocumentId, Document } from '../../models';

export default async function runAction(nango: NangoAction, input: DocumentId): Promise<Document> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'The input must be an object with an "id" property.'
        });
    }

    const config: ProxyConfiguration = {
        // https://developers.google.com/docs/api/reference/rest/v1/documents/get
        endpoint: `/v1/documents/${input.id}`,
        params: {
            includeTabsContent: 'true'
        },
        retries: 3
    };

    const documentResponse = await nango.get<Document>(config);

    if (documentResponse.status !== 200) {
        throw new nango.ActionError(`Failed to fetch document: Status Code ${documentResponse.status}`);
    }

    return documentResponse.data;
}
