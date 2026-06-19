import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,abc123"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const DriveSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        driveType: z.string().optional(),
        createdDateTime: z.string().optional(),
        lastModifiedDateTime: z.string().optional(),
        webUrl: z.string().optional(),
        description: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(DriveSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List document libraries on a site.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {};
        if (input.cursor) {
            params['$skiptoken'] = input.cursor;
        }

        // https://learn.microsoft.com/graph/api/site-list-drives
        const response = await nango.get({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives`,
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => {
            return DriveSchema.parse(item);
        });

        let nextCursor: string | undefined;
        if (providerResponse['@odata.nextLink']) {
            const nextLink = providerResponse['@odata.nextLink'];
            const url = new URL(nextLink);
            const skipToken = url.searchParams.get('$skiptoken');
            if (skipToken) {
                nextCursor = skipToken;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
