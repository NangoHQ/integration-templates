import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    query: z.string().describe('Search query string. Example: "budget"')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional(),
    parentReference: z
        .object({
            driveId: z.string().optional(),
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional()
});

const ProviderSearchResponseSchema = z.object({
    value: z.array(ProviderDriveItemSchema),
    '@odata.nextLink': z.string().optional()
});

const DriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    folder: z
        .object({
            childCount: z.number().optional()
        })
        .optional(),
    file: z
        .object({
            mimeType: z.string().optional()
        })
        .optional(),
    parentReference: z
        .object({
            driveId: z.string().optional(),
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(DriveItemSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'Search drive items by keyword',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-items',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read', 'Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-search
            endpoint: `/v1.0/me/drive/root/search(q='${encodeURIComponent(input.query)}')`,
            retries: 3
        });

        const validatedData = ProviderSearchResponseSchema.parse(response.data);

        return {
            items: validatedData.value.map((item) => ({
                id: item.id,
                name: item.name,
                ...(item.size !== undefined && { size: item.size }),
                ...(item.webUrl !== undefined && { webUrl: item.webUrl }),
                ...(item.createdDateTime !== undefined && {
                    createdDateTime: item.createdDateTime
                }),
                ...(item.lastModifiedDateTime !== undefined && {
                    lastModifiedDateTime: item.lastModifiedDateTime
                }),
                ...(item.folder !== undefined && {
                    folder: {
                        ...(item.folder.childCount !== undefined && {
                            childCount: item.folder.childCount
                        })
                    }
                }),
                ...(item.file !== undefined && {
                    file: {
                        ...(item.file.mimeType !== undefined && {
                            mimeType: item.file.mimeType
                        })
                    }
                }),
                ...(item.parentReference !== undefined && {
                    parentReference: {
                        ...(item.parentReference.driveId !== undefined && {
                            driveId: item.parentReference.driveId
                        }),
                        ...(item.parentReference.id !== undefined && {
                            id: item.parentReference.id
                        }),
                        ...(item.parentReference.path !== undefined && {
                            path: item.parentReference.path
                        })
                    }
                })
            })),
            ...(validatedData['@odata.nextLink'] !== undefined && {
                nextLink: validatedData['@odata.nextLink']
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
