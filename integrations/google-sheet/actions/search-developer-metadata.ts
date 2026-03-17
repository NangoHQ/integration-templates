import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    spreadsheetId: z.string(),
    dataFilters: z.array(
        z
            .object({
                developerMetadataLookup: z.record(z.string(), z.unknown()).optional(),
                a1Range: z.string().optional(),
                gridRange: z.record(z.string(), z.unknown()).optional()
            })
            .passthrough()
    )
});

const DeveloperMetadataSchema = z.object({
    metadataId: z.number(),
    metadataKey: z.string(),
    metadataValue: z.string(),
    location: z.record(z.string(), z.unknown()),
    visibility: z.string()
});

const DataFilterSchema = z
    .object({
        developerMetadataLookup: z.record(z.string(), z.unknown()).optional(),
        a1Range: z.string().optional(),
        gridRange: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const MatchedDeveloperMetadataSchema = z.object({
    developerMetadata: DeveloperMetadataSchema,
    dataFilters: z.array(DataFilterSchema)
});

const OutputSchema = z.object({
    matchedDeveloperMetadata: z.array(MatchedDeveloperMetadataSchema)
});

const action = createAction({
    description: 'Search developer metadata by criteria',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/search-developer-metadata',
        group: 'Developer Metadata'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.developerMetadata/search
            endpoint: `/v4/spreadsheets/${input.spreadsheetId}/developerMetadata:search`,
            data: {
                dataFilters: input.dataFilters
            },
            retries: 3
        });

        return {
            matchedDeveloperMetadata: response.data.matchedDeveloperMetadata || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
