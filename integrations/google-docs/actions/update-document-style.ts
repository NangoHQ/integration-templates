import { z } from 'zod';
import { createAction } from 'nango';

const DimensionSchema = z.object({
    magnitude: z.number().describe('The magnitude of the dimension. Example: 72'),
    unit: z.string().describe('The unit of the dimension. Example: "PT"')
});

const PageSizeSchema = z.object({
    width: DimensionSchema,
    height: DimensionSchema
});

const DocumentStyleInputSchema = z.object({
    marginTop: DimensionSchema.optional().describe('Top margin of the document.'),
    marginBottom: DimensionSchema.optional().describe('Bottom margin of the document.'),
    marginLeft: DimensionSchema.optional().describe('Left margin of the document.'),
    marginRight: DimensionSchema.optional().describe('Right margin of the document.'),
    pageSize: PageSizeSchema.optional().describe('Page size of the document.'),
    pageNumberStart: z.number().optional().describe('The page number from which to start counting pages.'),
    defaultHeaderId: z.string().optional().describe('The ID of the default header.'),
    defaultFooterId: z.string().optional().describe('The ID of the default footer.'),
    evenPageHeaderId: z.string().optional().describe('The ID of the header used on even pages.'),
    evenPageFooterId: z.string().optional().describe('The ID of the footer used on even pages.'),
    firstPageHeaderId: z.string().optional().describe('The ID of the header used on the first page.'),
    firstPageFooterId: z.string().optional().describe('The ID of the footer used on the first page.'),
    useCustomHeaderFooterMargins: z.boolean().optional().describe('Whether to use custom header and footer margins.'),
    useFirstPageHeaderFooter: z.boolean().optional().describe('Whether to use a different header and footer on the first page.'),
    useEvenPageHeaderFooter: z.boolean().optional().describe('Whether to use different headers and footers on even pages.')
});

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document to update. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    fields: z.string().describe('The comma-separated field mask of document style fields to update. Example: "marginTop,marginBottom,pageSize"'),
    documentStyle: DocumentStyleInputSchema.describe('The document style values to apply.'),
    tabId: z.string().optional().describe('The tab that contains the style to update. When omitted, the request applies to the first tab.')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(z.unknown()).optional(),
    writeControl: z.unknown().optional()
});

const OutputSchema = z.object({
    documentId: z.string(),
    updated: z.boolean()
});

const action = createAction({
    description: 'Update document-level page and margin styling.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-document-style',
        group: 'Documents'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateRequest: {
            updateDocumentStyle: {
                documentStyle: Record<string, unknown>;
                fields: string;
                tabId?: string;
            };
        } = {
            updateDocumentStyle: {
                documentStyle: {},
                fields: input.fields
            }
        };

        if (input.tabId !== undefined) {
            updateRequest.updateDocumentStyle.tabId = input.tabId;
        }

        const stylePayload = updateRequest.updateDocumentStyle.documentStyle;

        if (input.documentStyle.marginTop !== undefined) {
            stylePayload['marginTop'] = input.documentStyle.marginTop;
        }
        if (input.documentStyle.marginBottom !== undefined) {
            stylePayload['marginBottom'] = input.documentStyle.marginBottom;
        }
        if (input.documentStyle.marginLeft !== undefined) {
            stylePayload['marginLeft'] = input.documentStyle.marginLeft;
        }
        if (input.documentStyle.marginRight !== undefined) {
            stylePayload['marginRight'] = input.documentStyle.marginRight;
        }
        if (input.documentStyle.pageSize !== undefined) {
            stylePayload['pageSize'] = input.documentStyle.pageSize;
        }
        if (input.documentStyle.pageNumberStart !== undefined) {
            stylePayload['pageNumberStart'] = input.documentStyle.pageNumberStart;
        }
        if (input.documentStyle.defaultHeaderId !== undefined) {
            stylePayload['defaultHeaderId'] = input.documentStyle.defaultHeaderId;
        }
        if (input.documentStyle.defaultFooterId !== undefined) {
            stylePayload['defaultFooterId'] = input.documentStyle.defaultFooterId;
        }
        if (input.documentStyle.evenPageHeaderId !== undefined) {
            stylePayload['evenPageHeaderId'] = input.documentStyle.evenPageHeaderId;
        }
        if (input.documentStyle.evenPageFooterId !== undefined) {
            stylePayload['evenPageFooterId'] = input.documentStyle.evenPageFooterId;
        }
        if (input.documentStyle.firstPageHeaderId !== undefined) {
            stylePayload['firstPageHeaderId'] = input.documentStyle.firstPageHeaderId;
        }
        if (input.documentStyle.firstPageFooterId !== undefined) {
            stylePayload['firstPageFooterId'] = input.documentStyle.firstPageFooterId;
        }
        if (input.documentStyle.useCustomHeaderFooterMargins !== undefined) {
            stylePayload['useCustomHeaderFooterMargins'] = input.documentStyle.useCustomHeaderFooterMargins;
        }
        if (input.documentStyle.useFirstPageHeaderFooter !== undefined) {
            stylePayload['useFirstPageHeaderFooter'] = input.documentStyle.useFirstPageHeaderFooter;
        }
        if (input.documentStyle.useEvenPageHeaderFooter !== undefined) {
            stylePayload['useEvenPageHeaderFooter'] = input.documentStyle.useEvenPageHeaderFooter;
        }

        const requestBody = {
            requests: [updateRequest]
        };

        // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
        const response = await nango.post({
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: requestBody,
            retries: 3
        });

        const batchResponse = BatchUpdateResponseSchema.parse(response.data);

        return {
            documentId: batchResponse.documentId,
            updated: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
