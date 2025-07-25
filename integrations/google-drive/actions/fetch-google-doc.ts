import type { NangoAction, ProxyConfiguration, IdEntity, JSONDocument } from '../../models.js';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<JSONDocument> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Invalid input',
            details: 'The input must be an object with an "id" property.'
        });
    }

    const config: ProxyConfiguration = {
        baseUrlOverride: 'https://docs.googleapis.com',
        // https://developers.google.com/docs/api/reference/rest/v1/documents/get
        endpoint: `/v1/documents/${input.id}`,
        params: {
            includeTabsContent: 'true'
        },
        retries: 3
    };

    const documentResponse = await nango.get<JSONDocument>(config);

    if (documentResponse.status !== 200) {
        throw new nango.ActionError(`Failed to fetch document: Status Code ${documentResponse.status}`);
    }

    return documentResponse.data;
}
