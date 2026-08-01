import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    recordType: z.string().describe('Record type to export. Example: "everyFieldType"'),
    properties: z.array(z.string()).min(1).describe('Property keys to include in the export. Example: ["name", "contractStatus"]')
});

const OutputSchema = z.object({
    content: z.string().describe('Base64-encoded XLSX file content'),
    contentType: z.string().describe('MIME type of the exported file'),
    filename: z.string().optional().describe('Suggested filename for the export')
});

const action = createAction({
    description: 'Download an XLSX export of records for a given record type and set of properties',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.records.readRecords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/retrieve-xlsx-export-file-of-all-records
            endpoint: '/public/api/v1/records/export',
            params: {
                types: input.recordType,
                properties: input.properties.join(',')
            },
            retries: 3,
            responseType: 'arraybuffer'
        });

        const content = Buffer.from(response.data).toString('base64');
        const contentType =
            typeof response.headers['content-type'] === 'string'
                ? response.headers['content-type']
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        const contentDisposition = typeof response.headers['content-disposition'] === 'string' ? response.headers['content-disposition'] : '';
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch ? filenameMatch[1] : `${input.recordType}-export.xlsx`;

        return {
            content,
            contentType,
            filename
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
