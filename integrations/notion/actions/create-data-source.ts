import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    databaseId: z.string().describe('The ID of the parent database (with or without dashes). Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"'),
    title: z.string().optional().describe('Title of the data source as it appears in Notion.'),
    icon: z
        .object({
            type: z.literal('emoji'),
            emoji: z.string()
        })
        .optional()
        .describe('Icon for the data source.'),
    properties: z
        .object({})
        .passthrough()
        .describe(
            'Property schema of the data source. Example: { "Name": { "title": {} }, "Status": { "select": { "options": [{ "name": "To Do", "color": "red" }] } } }'
        )
});

const DataSourceResponseSchema = z.object({
    object: z.literal('data_source'),
    id: z.string(),
    title: z
        .array(
            z.object({
                type: z.string(),
                text: z
                    .object({
                        content: z.string()
                    })
                    .optional()
            })
        )
        .optional(),
    parent: z.object({
        type: z.string(),
        database_id: z.string()
    }),
    properties: z.object({}).passthrough(),
    url: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    databaseId: z.string(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Create a Notion data source in its supported parent container.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-data-source',
        group: 'Data Sources'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['database', 'data_source'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const titleContent = input.title || 'New Data Source';

        const requestBody: Record<string, unknown> = {
            parent: {
                database_id: input.databaseId
            },
            title: [
                {
                    type: 'text',
                    text: {
                        content: titleContent
                    }
                }
            ],
            properties: input.properties
        };

        if (input.icon) {
            requestBody['icon'] = input.icon;
        }

        // https://developers.notion.com/reference/create-a-data-source
        const response = await nango.post({
            endpoint: '/v1/data_sources',
            headers: {
                'Notion-Version': '2026-03-11'
            },
            data: requestBody,
            retries: 3
        });

        const dataSource = DataSourceResponseSchema.parse(response.data);

        const titleText = dataSource.title?.[0]?.text?.content || '';

        return {
            id: dataSource.id,
            title: titleText,
            databaseId: dataSource.parent.database_id,
            url: dataSource.url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
