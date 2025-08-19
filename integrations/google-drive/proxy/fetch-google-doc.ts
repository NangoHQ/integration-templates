import { Nango } from '@nangohq/node';

const nango = new Nango({ secretKey: String(process.env['NANGO_SECRET_KEY']) });

interface JSONDocument {
    documentId: string;
    title: string;
    url: string;
    tabs: Record<string, any>[];
    revisionId: string;
    suggestionsViewMode: 'DEFAULT_FOR_CURRENT_ACCESS' | 'SUGGESTIONS_INLINE' | 'PREVIEW_SUGGESTIONS_ACCEPTED' | 'PREVIEW_WITHOUT_SUGGESTIONS';
    body: Record<string, any>;
    headers: Record<string, any>;
    footers: Record<string, any>;
    footnotes: Record<string, any>;
    documentStyle: Record<string, any>;
    suggestedDocumentStyleChanges: Record<string, any>;
    namedStyles: Record<string, any>;
    suggestedNamedStylesChanges: Record<string, any>;
    lists: Record<string, any>;
    namedRanges: Record<string, any>;
    inlineObjects: Record<string, any>;
    positionedObjects: Record<string, any>;
}

/**
 * Fetch google document
 * @desc it is recommended to use the Nango proxy to fetch large content
 * so this function should run in your stack using the proxy
 * @see https://docs.nango.dev/guides/proxy-requests#proxy-requests
 */
async function run(input: { id: string }): Promise<JSONDocument> {
    const config = {
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
        throw new Error(`Failed to fetch document: Status Code ${documentResponse.status}`);
    }

    return documentResponse.data;
}

const documentId = { id: 'your-document-id' }; // Replace with your actual document ID

await run(documentId);
