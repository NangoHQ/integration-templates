import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    accountId: z.string()
});

const InputSchema = z.object({
    search_text: z.string().optional().describe('Search text to filter templates'),
    shared: z.string().optional().describe('Filter by shared status. Example: "true" or "false"'),
    folder_id: z.string().optional().describe('Folder ID to filter templates'),
    start_position: z.string().optional().describe('Pagination start position. Example: "0"'),
    count: z.string().optional().describe('Number of items to return per page. Example: "10"')
});

const TemplateSchema = z.object({
    templateId: z.string(),
    name: z.string().optional(),
    shared: z.string().optional(),
    description: z.string().optional(),
    created: z.string().optional(),
    lastModified: z.string().optional(),
    uri: z.string().optional(),
    folderId: z.string().optional(),
    folderName: z.string().optional(),
    folderUri: z.string().optional()
});

const ProviderResponseSchema = z.object({
    resultSetSize: z.string().optional(),
    totalSetSize: z.string().optional(),
    startPosition: z.string().optional(),
    endPosition: z.string().optional(),
    envelopeTemplates: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(TemplateSchema),
    next_start_position: z.string().optional()
});

const action = createAction({
    description: 'List account templates with optional search and pagination',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['signature'],
    metadata: MetadataSchema,
    endpoint: {
        path: '/actions/list-templates',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in metadata.'
            });
        }
        const accountId = parsedMetadata.data.accountId;

        // https://developers.docusign.com/docs/esign-rest-api/reference/templates/templates/list/
        const response = await nango.get({
            endpoint: `/restapi/v2.1/accounts/${encodeURIComponent(accountId)}/templates`,
            params: {
                ...(input.search_text !== undefined && { search_text: input.search_text }),
                ...(input.shared !== undefined && { shared: input.shared }),
                ...(input.folder_id !== undefined && { folder_id: input.folder_id }),
                ...(input.start_position !== undefined && { start_position: input.start_position }),
                ...(input.count !== undefined && { count: input.count })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = (providerResponse.envelopeTemplates || []).map((item: unknown) => {
            const template = TemplateSchema.parse(item);
            return {
                templateId: template.templateId,
                ...(template.name !== undefined && { name: template.name }),
                ...(template.shared !== undefined && { shared: template.shared }),
                ...(template.description !== undefined && { description: template.description }),
                ...(template.created !== undefined && { created: template.created }),
                ...(template.lastModified !== undefined && { lastModified: template.lastModified }),
                ...(template.uri !== undefined && { uri: template.uri }),
                ...(template.folderId !== undefined && { folderId: template.folderId }),
                ...(template.folderName !== undefined && { folderName: template.folderName }),
                ...(template.folderUri !== undefined && { folderUri: template.folderUri })
            };
        });

        const totalSetSize = providerResponse.totalSetSize ? parseInt(providerResponse.totalSetSize, 10) : 0;
        const endPosition = providerResponse.endPosition ? parseInt(providerResponse.endPosition, 10) : 0;
        const nextStartPosition = endPosition + 1 < totalSetSize ? String(endPosition + 1) : undefined;

        return {
            items,
            ...(nextStartPosition !== undefined && { next_start_position: nextStartPosition })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
