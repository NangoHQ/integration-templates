import type { NangoAction, ProxyConfiguration, RowEntry, SuccessResponse, CreateDatabaseRowInput } from '../../models';
import { mapPropertiesToNotionFormat } from '../helpers/map-properties.js';
import { notionPropertySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: CreateDatabaseRowInput): Promise<SuccessResponse> {
    const { databaseId, properties } = input;

    const queryProxyConfig: ProxyConfiguration = {
        method: 'POST',
        // https://developers.notion.com/reference/retrieve-a-database
        endpoint: `/v1/databases/${databaseId}/query`
    };

    const entries: RowEntry[] = [];
    for await (const dbPages of nango.paginate<any>(queryProxyConfig)) {
        for (const dbPage of dbPages) {
            const id = dbPage.id;
            const row = dbPage.properties;
            entries.push({ id, row });
        }
    }

    const databaseResponse = await nango.get({
        // https://developers.notion.com/reference/retrieve-a-database
        endpoint: `/v1/databases/${databaseId}`,
        retries: 10
    });
    const data = databaseResponse.data;

    const schema: Record<string, { type: string }> = {};

    if (data.properties) {
        for (const [key, propertySchema] of Object.entries(data.properties)) {
            const parseResult = notionPropertySchema.safeParse(propertySchema);
            if (parseResult.success) {
                schema[key] = { type: parseResult.data.type };
            }
        }
    } else {
        for (const entry of entries) {
            for (const [key, propertyInfo] of Object.entries(entry.row)) {
                if (!schema[key]) {
                    const parseResult = notionPropertySchema.safeParse(propertyInfo);
                    if (parseResult.success) {
                        schema[key] = { type: parseResult.data.type };
                    }
                }
            }
        }
    }

    const dbRow = mapPropertiesToNotionFormat(schema, properties);

    const createConfig: ProxyConfiguration = {
        // https://developers.notion.com/reference/post-page
        endpoint: '/v1/pages',
        data: {
            parent: { database_id: databaseId },
            properties: dbRow
        },
        retries: 5
    };

    await nango.post(createConfig);

    return { success: true };
}
