import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    subject: z.string().describe('Document subject. Example: "Invoice attachment"'),
    documentDate: z.string().describe('Document date in ISO format. Example: "2024-05-30"'),
    account: z.string().describe('Customer account GUID. Example: "a58c29d9-ef92-40f1-b817-31b36990898c"'),
    type: z.number().describe('Document type number. Example: 10'),
    fileName: z.string().describe('Name of the file being attached. Example: "invoice.pdf"'),
    fileContent: z.string().describe('Base64-encoded file content. Example: "JVBERi0xLjQKJ..."'),
    invoiceId: z.string().optional().describe('Sales invoice GUID to link this document to. Example: "7b282ae4-d920-46b0-87fd-3da21b818780"')
});

const OutputSchema = z.object({
    documentId: z.string().describe('Created document ID.')
});

const MeResponseSchema = z.object({
    d: z.object({
        results: z.array(
            z.object({
                CurrentDivision: z.number()
            })
        )
    })
});

const PostDocumentResponseSchema = z.object({
    d: z
        .object({
            __metadata: z.object({
                uri: z.string()
            }),
            ID: z.string().nullable().optional()
        })
        .passthrough()
});

const action = createAction({
    description: 'Attach a document/file and optionally link it to a sales invoice',
    version: '3.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents'],

    exec: async (nango, input) => {
        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-faq-rest-api
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });
        const meData = MeResponseSchema.parse(meResponse.data);
        const division = meData.d.results[0]?.CurrentDivision;
        if (!division) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not retrieve current division from Me endpoint.'
            });
        }

        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-rest-api-business-cases-rest-bsncs--entrattach
        const documentResponse = await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(division)}/documents/Documents`,
            data: {
                Subject: input.subject,
                DocumentDate: input.documentDate,
                Account: input.account,
                Type: input.type
            },
            retries: 3
        });
        const documentData = PostDocumentResponseSchema.parse(documentResponse.data);
        const documentId = documentData.d.ID ?? extractDocumentIdFromUri(documentData.d.__metadata.uri);
        if (!documentId) {
            throw new nango.ActionError({
                type: 'missing_document_id',
                message: 'Could not extract document ID from creation response.'
            });
        }

        // https://support.exactonline.com/community/s/article/All-All-DNO-Content-rest-api-business-cases-rest-bsncs--entrattach
        await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(division)}/documents/DocumentAttachments`,
            data: {
                Document: documentId,
                Attachment: input.fileContent,
                FileName: input.fileName
            },
            retries: 3
        });

        if (input.invoiceId) {
            // https://support.exactonline.com/community/s/article/All-All-DNO-Content-rest-api-business-cases-rest-bsncs--entrattach
            await nango.put({
                endpoint: `/api/v1/${encodeURIComponent(division)}/salesinvoice/SalesInvoices(guid'${encodeURIComponent(input.invoiceId)}')`,
                data: {
                    Document: documentId
                },
                retries: 3
            });
        }

        return {
            documentId: documentId
        };
    }
});

function extractDocumentIdFromUri(uri: string): string | null {
    const match = uri.match(/guid['"]([0-9a-fA-F-]{36})['"]/);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
