import { createAction } from "nango";
import { mapPropertiesToNotionFormat } from '../helpers/map-properties.js';
import { createDatabaseRowInputSchema, notionPropertySchema } from '../schema.zod.js';
import type { NotionCreatePageResponse, Database as NotionDatabase, NotionGetDatabaseResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import type { RowEntry} from "../models.js";
import { CreateDatabaseRowOutput, CreateDatabaseRowInput } from "../models.js";

const action = createAction({
    description: "Create a new row in a specified Notion database. \nThe properties are mapped to Notion-compatible formats based on the database schema. \nSupported property types include:\n- `title` (string): Creates a title property.\n- `select` (string): Creates a select property.\n- `multi_select` (array of strings): Creates a multi-select property.\n- `status` (string): Creates a status property.\n- `date` (string or object): Supports ISO date strings or objects with a `start` field.\n- `checkbox` (boolean): Creates a checkbox property.\n- `number` (number): Creates a number property.\n- `url` (string): Creates a URL property.\n- `email` (string): Creates an email property.\n- `phone_number` (string): Creates a phone number property.\n- `rich_text` (string): Creates a rich text property.\n- `relation` (array of IDs): Creates a relation property.",
    version: "1.0.1",

    endpoint: {
        method: "POST",
        path: "/databases/row",
        group: "Databases"
    },

    input: CreateDatabaseRowInput,
    output: CreateDatabaseRowOutput,

    exec: async (nango, input): Promise<CreateDatabaseRowOutput> => {
        const parsedResult = await nango.zodValidateInput({ zodSchema: createDatabaseRowInputSchema, input });
        const { databaseId, properties } = parsedResult.data;

        const databaseResponse = await nango.get<NotionGetDatabaseResponse>({
            // https://developers.notion.com/reference/retrieve-a-database
            endpoint: `/v1/databases/${databaseId}`,
            retries: 3
        });
        const data = databaseResponse.data;

        const schema: Record<string, { type: string }> = {};

        if (data.properties && Object.keys(data.properties).length > 0) {
            for (const [key, propertyDef] of Object.entries(data.properties)) {
                const check = notionPropertySchema.safeParse(propertyDef);
                if (check.success) {
                    schema[key] = { type: check.data.type };
                }
            }
        } else {
            // NOTE: If the top-level database object doesn't provide properties,
            // we iterate over all rows to infer them from existing usage.
            // This ensures we don't miss columns that haven't been filled out yet.
            const queryProxyConfig: ProxyConfiguration = {
                method: 'POST',
                // https://developers.notion.com/reference/post-database-query
                endpoint: `/v1/databases/${databaseId}/query`
            };

            const entries: RowEntry[] = [];
            for await (const dbPages of nango.paginate<NotionDatabase>(queryProxyConfig)) {
                for (const dbPage of dbPages) {
                    const id = dbPage.id;
                    const row = dbPage.properties;
                    entries.push({ id, row });
                }
            }

            for (const entry of entries) {
                for (const [key, propertyInfo] of Object.entries(entry.row)) {
                    if (!schema[key]) {
                        const check = notionPropertySchema.safeParse(propertyInfo);
                        if (check.success) {
                            schema[key] = { type: check.data.type };
                        }
                    }
                }
            }
        }

        const schemaMap: Record<string, string> = {};
        for (const realKey of Object.keys(schema)) {
            schemaMap[realKey.toLowerCase()] = realKey;
        }

        const finalUserProps: Record<string, any> = {};
        for (const [userKey, userValue] of Object.entries(properties)) {
            const userKeyLower = userKey.toLowerCase();
            if (schemaMap[userKeyLower]) {
                const realSchemaKey = schemaMap[userKeyLower];
                finalUserProps[String(realSchemaKey)] = userValue;
            }
        }

        const dbRow = mapPropertiesToNotionFormat(schema, finalUserProps);

        const createConfig: ProxyConfiguration = {
            // https://developers.notion.com/reference/post-page
            endpoint: '/v1/pages',
            data: {
                parent: { database_id: databaseId },
                properties: dbRow
            },
            retries: 3
        };

        await nango.post<NotionCreatePageResponse>(createConfig);

        const addedProperties = Object.entries(dbRow).map(([propertyKey, notionValue]) => ({
            propertyKey,
            notionValue
        }));

        return {
            success: true,
            addedProperties
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
