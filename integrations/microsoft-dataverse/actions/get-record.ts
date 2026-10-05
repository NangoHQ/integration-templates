import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        entitySetName: z
            .string()
            .describe(
                'The Dataverse entity set name (plural collection used in the Web API URL) of the record to retrieve, e.g. "accounts", "contacts", "incidents". Works for standard and custom entities; discover set names with the list-entity-definitions action.'
            ),
        id: z.string().describe('The GUID of the record to retrieve, with or without hyphens. Example: "550e8400-e29b-41d4-a716-446655440000".'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Logical names of the columns to return (OData $select), e.g. ["name", "telephone1"]. Omit to return all columns that currently have a value.'
            ),
        expand: z
            .array(z.string())
            .optional()
            .describe('Navigation property names to expand inline (OData $expand), e.g. ["primarycontactid"]. Omit to return no expanded relationships.')
    })
    .describe(
        'Identifies the Dataverse record to retrieve by entity set name and GUID, plus optional column ($select) and relationship ($expand) projections.'
    );

const DataverseRecordSchema = z.record(z.string(), z.unknown());

const OutputSchema = z
    .object({
        id: z
            .string()
            .describe(
                'The GUID of the retrieved record, echoed from the input. The primary key attribute name inside "record" varies per entity, so this provides a stable accessor.'
            ),
        record: DataverseRecordSchema.describe(
            'The full record payload as returned by the Dataverse Web API, keyed by column logical name. Includes OData annotations such as "@odata.etag". Top-level columns with no value are omitted by the provider rather than returned as null, while expanded navigation records do include explicit nulls.'
        )
    })
    .describe('The retrieved Dataverse record: a stable id accessor plus the full raw record payload.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET against the provider and never creates, updates, or deletes data.
 * @pitfalls: Top-level columns with no value are omitted from the record rather than returned as null, while expanded navigation records do include explicit nulls. Lookup columns are returned as "_<column>_value" GUID fields rather than nested objects. A nonexistent record id or unknown entity set name surfaces as a provider error (404), not an empty result.
 */
const action = createAction({
    description: 'Retrieve a single record of any Dataverse entity by id',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/${encodeURIComponent(input.entitySetName)}(${encodeURIComponent(input.id)})`,
            params: {
                ...(input.select && input.select.length > 0 && { $select: input.select.join(',') }),
                ...(input.expand && input.expand.length > 0 && { $expand: input.expand.join(',') })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const record = DataverseRecordSchema.parse(response.data);

        return {
            id: input.id,
            record
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
