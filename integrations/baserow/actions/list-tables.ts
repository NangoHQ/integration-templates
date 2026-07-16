import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderTableSchema = z.object({
    id: z.number(),
    name: z.string(),
    order: z.number(),
    database_id: z.number()
});

const OutputSchema = z.object({
    tables: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            order: z.number(),
            database_id: z.number()
        })
    )
});

const action = createAction({
    description: 'List all tables the database token can access.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://api.baserow.io/api/redoc/#tag/Database-tables/operation/list_database_tables_all
            endpoint: '/database/tables/all-tables/',
            retries: 3
        });

        const providerTables = z.array(ProviderTableSchema).parse(response.data);

        return {
            tables: providerTables.map((table) => ({
                id: table.id,
                name: table.name,
                order: table.order,
                database_id: table.database_id
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
