import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Title for the new Google Doc. Example: "Meeting Notes"')
});

const ProviderDocumentSchema = z.object({
    documentId: z.string(),
    revisionId: z.string()
});

const OutputSchema = z.object({
    documentId: z.string(),
    revisionId: z.string()
});

const action = createAction({
    description: 'Create a blank Google Doc with a title',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-document',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents', 'drive'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/create
            endpoint: '/v1/documents',
            data: {
                title: input.title
            },
            retries: 3
        });

        const providerDoc = ProviderDocumentSchema.parse(response.data);

        return {
            documentId: providerDoc.documentId,
            revisionId: providerDoc.revisionId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
