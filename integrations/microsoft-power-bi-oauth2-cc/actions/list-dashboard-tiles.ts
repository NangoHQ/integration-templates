import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    dashboardId: z.string().describe('Dashboard ID. Example: "6d523d62-67dc-4f5e-8642-4ecf1028aa89"')
});

const ProviderTileSchema = z.object({
    id: z.string(),
    title: z.string(),
    embedUrl: z.string(),
    rowSpan: z.number(),
    colSpan: z.number(),
    reportId: z.string().nullable().optional(),
    datasetId: z.string().nullable().optional(),
    embedData: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderTileSchema).optional()
});

const OutputSchema = z.object({
    tiles: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            embedUrl: z.string(),
            rowSpan: z.number(),
            colSpan: z.number(),
            reportId: z.string().optional(),
            datasetId: z.string().optional(),
            embedData: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List the tiles on a dashboard.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Dashboard.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/rest/api/power-bi/dashboards/get-tiles
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/dashboards/${encodeURIComponent(input.dashboardId)}/tiles`,
            retries: 3
        };

        const response = await nango.get(config);
        const providerResponse = ProviderResponseSchema.parse(response.data);
        const rawTiles = providerResponse.value ?? [];

        const tiles = rawTiles.map((tile) => ({
            id: tile.id,
            title: tile.title,
            embedUrl: tile.embedUrl,
            rowSpan: tile.rowSpan,
            colSpan: tile.colSpan,
            ...(tile.reportId != null && { reportId: tile.reportId }),
            ...(tile.datasetId != null && { datasetId: tile.datasetId }),
            ...(tile.embedData != null && { embedData: tile.embedData })
        }));

        return { tiles };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
