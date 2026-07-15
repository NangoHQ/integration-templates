import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    flowFolderOwnerEmail: z.string().describe('Email of the flow owner whose folders (including personal and shared) should be included.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FolderSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(FolderSchema).nullable(),
    nextCursor: z.string().nullish()
});

const action = createAction({
    description: 'List Gong Engage flow folders',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://help.gong.io/docs/gong-engage-api-capabilities
            endpoint: '/v2/flows/folders',
            params: {
                ...(input.flowFolderOwnerEmail !== undefined && { flowFolderOwnerEmail: input.flowFolderOwnerEmail }),
                ...(input.cursor !== undefined && { cursor: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const responseData = z
            .object({
                flowsFolders: z.array(z.unknown()).optional(),
                records: z
                    .object({
                        cursor: z.string().optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const items = (responseData.flowsFolders || []).map((item) => {
            return FolderSchema.parse(item);
        });

        return {
            items,
            ...(responseData.records?.cursor != null && { nextCursor: responseData.records.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
