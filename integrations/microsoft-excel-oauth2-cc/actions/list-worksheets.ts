import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID containing the workbook. Example: "b!abc123"'),
    itemId: z.string().describe('Item ID of the workbook file. Example: "01RFYLAY..."')
});

const ProviderWorksheetSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().optional(),
    visibility: z.string().optional()
});

const WorksheetSchema = z.object({
    id: z.string(),
    name: z.string(),
    position: z.number().optional(),
    visibility: z.string().optional()
});

const OutputSchema = z.object({
    worksheets: z.array(WorksheetSchema)
});

const action = createAction({
    description: 'List worksheets in a workbook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All', 'Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/worksheet-list
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/workbook/worksheets`,
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                limit: 100,
                limit_name_in_request: '$top'
            },
            retries: 3
        };

        const worksheets: z.infer<typeof WorksheetSchema>[] = [];

        for await (const batch of nango.paginate(proxyConfig)) {
            const parsedBatch = z.array(ProviderWorksheetSchema).parse(batch);

            worksheets.push(
                ...parsedBatch.map((worksheet) => ({
                    id: worksheet.id,
                    name: worksheet.name,
                    ...(worksheet.position !== undefined && { position: worksheet.position }),
                    ...(worksheet.visibility !== undefined && { visibility: worksheet.visibility })
                }))
            );
        }

        return { worksheets };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
