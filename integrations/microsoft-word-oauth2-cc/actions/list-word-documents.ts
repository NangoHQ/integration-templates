import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    query: z.string().optional().describe('Search query to filter documents by name. Omit to list all documents.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FileSchema = z
    .object({
        mimeType: z.string().optional(),
        hashes: z
            .object({
                quickXorHash: z.string().optional()
            })
            .optional()
            .nullable()
    })
    .optional()
    .nullable();

const ParentReferenceSchema = z
    .object({
        driveId: z.string().optional(),
        id: z.string().optional(),
        path: z.string().optional()
    })
    .optional()
    .nullable();

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    file: FileSchema,
    parentReference: ParentReferenceSchema
});

const GraphResponseSchema = z.object({
    value: z.array(z.unknown()).optional().default([]),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(DriveItemSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List/search .docx files within a drive',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDriveId = encodeURIComponent(input.driveId);

        let endpoint: string;
        if (input.cursor) {
            if (input.cursor.startsWith('https://')) {
                const cursorUrl = new URL(input.cursor);
                endpoint = cursorUrl.pathname + cursorUrl.search;
            } else {
                endpoint = input.cursor;
            }
        } else if (input.query) {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-search
            endpoint = `/v1.0/drives/${encodedDriveId}/root/search(q='${encodeURIComponent(input.query)}')`;
        } else {
            // https://learn.microsoft.com/en-us/graph/api/driveitem-list-children
            endpoint = `/v1.0/drives/${encodedDriveId}/items/root/children`;
        }

        // https://learn.microsoft.com/en-us/graph/api/resources/driveitem
        const config = {
            endpoint,
            retries: 3
        };

        const response = await nango.get(config);

        const graphResponse = GraphResponseSchema.parse(response.data);

        const items: z.infer<typeof DriveItemSchema>[] = [];
        for (const rawItem of graphResponse.value) {
            const parsed = DriveItemSchema.safeParse(rawItem);
            if (parsed.success && parsed.data.file?.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                items.push(parsed.data);
            }
        }

        return {
            items,
            ...(graphResponse['@odata.nextLink'] !== undefined && { nextCursor: graphResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
