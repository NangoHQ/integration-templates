import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    envelopeId: z.string().describe('DocuSign envelope ID. Example: "ffbe2429-fc88-8ef2-803e-8ad9296118b6"')
});

const EnvelopeDocumentSchema = z.object({
    documentId: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional(),
    pages: z.union([z.string(), z.array(z.unknown())]).optional(),
    authoritativeCopy: z.string().optional(),
    contentBytes: z.string().optional()
});

const ProviderResponseSchema = z.object({
    envelopeId: z.string().optional(),
    envelopeDocuments: z.array(EnvelopeDocumentSchema).optional()
});

const OutputItemSchema = z.object({
    documentId: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    uri: z.string().optional(),
    pages: z.string().optional()
});

const OutputSchema = z.object({
    envelopeId: z.string(),
    documents: z.array(OutputItemSchema)
});

const action = createAction({
    description: 'List document metadata for an envelope (no binary download).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    endpoint: {
        method: 'GET',
        path: '/actions/list-envelope-documents'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        let accountId =
            typeof metadata === 'object' && metadata !== null && 'accountId' in metadata ? z.string().safeParse(metadata['accountId']).data : undefined;

        if (!accountId) {
            const connection = await nango.getConnection();
            const connectionConfig = connection.connection_config;
            accountId = connectionConfig ? connectionConfig['accountId'] : undefined;
        }

        if (!accountId) {
            throw new nango.ActionError({
                type: 'missing_account_id',
                message: 'accountId is required in connection metadata or connection_config.'
            });
        }

        // https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopedocuments/get/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/envelopes/${encodeURIComponent(input.envelopeId)}/documents`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);
        const envelopeId = providerData.envelopeId || input.envelopeId;
        const documents = (providerData.envelopeDocuments || []).map((doc) => {
            const pages = Array.isArray(doc.pages) ? String(doc.pages.length) : doc.pages;
            return OutputItemSchema.parse({
                documentId: doc.documentId,
                ...(doc.name !== undefined && { name: doc.name }),
                ...(doc.type !== undefined && { type: doc.type }),
                ...(doc.uri !== undefined && { uri: doc.uri }),
                ...(pages !== undefined && { pages })
            });
        });

        return {
            envelopeId,
            documents
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
