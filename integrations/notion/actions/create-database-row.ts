import type { NangoAction, ProxyConfiguration, RowEntry, CreateDatabaseRowInput, CreateDatabaseRowOutput } from '../../models';
import { mapPropertiesToNotionFormat } from '../helpers/map-properties.js';
import { createDatabaseRowInputSchema, notionPropertySchema } from '../schema.zod.js';
import type { NotionCreatePageResponse, Database as NotionDatabase, NotionGetDatabaseResponse } from '../types.js';

export default async function runAction(nango: NangoAction, input: CreateDatabaseRowInput): Promise<CreateDatabaseRowOutput> {
    const parseResult = createDatabaseRowInputSchema.safeParse(input);
    if (!parseResult.success) {
        const message = parseResult.error.errors.map((err) => `${err.message} at path ${err.path.join('.')}`).join('; ');
        throw new nango.ActionError({
            message: `Invalid create-database-row input: ${message}`
        });
    }
    const { databaseId, properties } = parseResult.data;

    const databaseResponse = await nango.get<NotionGetDatabaseResponse>({
        // https://developers.notion.com/reference/retrieve-a-database
        endpoint: `/v1/databases/${databaseId}`,
        retries: 10
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
            finalUserProps[realSchemaKey] = userValue;
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
        retries: 5
    };

    await nango.post<NotionCreatePageResponse>(createConfig);

    const addedProperties = Object.keys(dbRow);

    return {
        success: true,
        addedProperties
    };
}
