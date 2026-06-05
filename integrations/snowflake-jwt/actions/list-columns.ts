import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    database: z.string().describe('Database name. Example: "NANGO_TEST_DB"'),
    schema: z.string().describe('Schema name. Example: "SALES"'),
    table: z.string().describe('Table name. Example: "CUSTOMERS"')
});

const ColumnSchema = z.object({
    table_name: z.string(),
    schema_name: z.string(),
    column_name: z.string(),
    data_type: z.string(),
    nullable: z.boolean(),
    default: z.string().optional(),
    kind: z.string(),
    autoincrement: z.string().optional()
});

const OutputSchema = z.object({
    columns: z.array(ColumnSchema)
});

const ResultSetSchema = z.object({
    resultSetMetaData: z.object({
        rowType: z.array(
            z.object({
                name: z.string()
            })
        )
    }),
    data: z.array(z.array(z.unknown()))
});

function parseBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return false;
}

function getCell(row: unknown[], index: number): unknown {
    if (index >= 0 && index < row.length) {
        return row[index];
    }
    return undefined;
}

const action = createAction({
    description: 'List columns in a Snowflake table with data types, nullability, and defaults.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-columns',
        group: 'Metadata'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input) => {
        const statement = `SHOW COLUMNS IN TABLE ${input.database}.${input.schema}.${input.table}`;

        const response = await nango.post({
            // https://docs.snowflake.com/en/developer-guide/sql-api/reference
            endpoint: '/api/v2/statements',
            data: {
                statement
            },
            retries: 3
        });

        const resultSet = ResultSetSchema.parse(response.data);

        const nameToIndex = new Map<string, number>();
        for (let i = 0; i < resultSet.resultSetMetaData.rowType.length; i++) {
            const col = resultSet.resultSetMetaData.rowType[i];
            if (col) {
                nameToIndex.set(col.name, i);
            }
        }

        const columns = resultSet.data.map((row) => {
            const get = (name: string): unknown => {
                const idx = nameToIndex.get(name);
                if (idx === undefined) {
                    return undefined;
                }
                return getCell(row, idx);
            };

            const table_name = String(get('table_name') ?? '');
            const schema_name = String(get('schema_name') ?? '');
            const column_name = String(get('column_name') ?? '');
            const data_type = String(get('data_type') ?? '');
            const nullable = parseBoolean(get('null?'));
            const defaultVal = get('default');
            const kind = String(get('kind') ?? '');
            const autoincrement = get('autoincrement');

            return {
                table_name,
                schema_name,
                column_name,
                data_type,
                nullable,
                ...(defaultVal !== undefined && defaultVal !== null && { default: String(defaultVal) }),
                kind,
                ...(autoincrement !== undefined && autoincrement !== null && { autoincrement: String(autoincrement) })
            };
        });

        return { columns };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
