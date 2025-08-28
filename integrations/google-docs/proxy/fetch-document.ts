import { Nango } from '@nangohq/node';
import type { Document, DocumentId } from '../types.js';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

/**
 * Fetch document
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: DocumentId): Promise<Document> {
    const config = {
        // https://developers.google.com/docs/api/reference/rest/v1/documents/get
        endpoint: `/v1/documents/${input.id}`,
        params: {
            includeTabsContent: 'true'
        },
        retries: 3
        // connectionId: 'your-notion-connection-id'
        // providerConfigKey: 'notion'
    };

    const documentResponse = await nango.get<Document>(config);

    if (documentResponse.status !== 200) {
        throw new Error(`Failed to fetch document: Status Code ${documentResponse.status}`);
    }

    return documentResponse.data;
}

const documentId: DocumentId = { id: 'your-document-id' }; // Replace with your actual document ID

await run(documentId);
