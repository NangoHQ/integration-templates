import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        logicalName: z
            .string()
            .regex(/^[a-z][a-z0-9_]*$/)
            .describe(
                'Logical (schema) name of the entity to look up. Logical names are lowercase alphanumeric plus underscores. Examples: "account", "contact", "opportunity", or a custom entity such as "new_project".'
            )
    })
    .describe('Input for looking up a single entity definition by its logical name.');

const ProviderEntityDefinitionSchema = z.object({
    LogicalName: z.string(),
    EntitySetName: z.string()
});

const OutputSchema = z
    .object({
        logicalName: z.string().describe('Logical (schema) name of the entity. Example: "account"'),
        entitySetName: z
            .string()
            .describe('Entity set name of the entity; this is the collection name used in Web API URLs. Example: "accounts" for the "account" entity.')
    })
    .describe('Core metadata for a single Dataverse entity definition.');

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only metadata lookup against the provider and never creates, updates, or deletes anything.
 */
const action = createAction({
    description: 'Get metadata for a single entity by logical name, including its entity set name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-metadata-name-metadataid
        const response = await nango.get({
            endpoint: `/api/data/v9.2/EntityDefinitions(LogicalName='${encodeURIComponent(input.logicalName)}')`,
            params: {
                $select: 'LogicalName,EntitySetName'
            },
            retries: 3
        });

        const definition = ProviderEntityDefinitionSchema.parse(response.data);

        return {
            logicalName: definition.LogicalName,
            entitySetName: definition.EntitySetName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
