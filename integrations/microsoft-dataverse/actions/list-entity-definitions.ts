import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DEFAULT_SELECT = ['LogicalName', 'EntitySetName', 'DisplayName', 'IsCustomEntity', 'ObjectTypeCode', 'IsActivity'];

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Entity metadata attribute names to return (OData $select), e.g. ["LogicalName", "EntitySetName", "DisplayName"], including custom metadata attributes. Defaults to LogicalName, EntitySetName, DisplayName, IsCustomEntity, ObjectTypeCode and IsActivity. MetadataId is always requested. Attributes beyond the curated output fields are passed through unchanged.'
            ),
        filter: z
            .string()
            .optional()
            .describe(
                'OData $filter expression applied to the entity metadata, e.g. "IsCustomEntity eq false". Do not use $top: the EntityDefinitions collection rejects it.'
            )
    })
    .describe('Query options for listing entity definitions.');

const RawLocalizedLabelSchema = z.object({
    Label: z.string().nullish(),
    LanguageCode: z.number().optional()
});

const RawLabelSchema = z.object({
    LocalizedLabels: z.array(RawLocalizedLabelSchema).optional(),
    // The API returns an explicit null here for entities without a localized label.
    UserLocalizedLabel: RawLocalizedLabelSchema.nullable().optional()
});

const RawEntityDefinitionSchema = z.looseObject({
    MetadataId: z.string(),
    LogicalName: z.string().optional(),
    EntitySetName: z.string().optional(),
    DisplayName: RawLabelSchema.optional(),
    IsCustomEntity: z.boolean().optional(),
    ObjectTypeCode: z.number().optional(),
    IsActivity: z.boolean().optional()
});

const KNOWN_ENTITY_DEFINITION_KEYS = new Set(['MetadataId', 'LogicalName', 'EntitySetName', 'DisplayName', 'IsCustomEntity', 'ObjectTypeCode', 'IsActivity']);

const RawEntityDefinitionsResponseSchema = z.object({
    value: z.array(RawEntityDefinitionSchema),
    '@odata.nextLink': z.string().optional()
});

const EntityDefinitionSchema = z
    .looseObject({
        metadata_id: z.string().describe('Unique metadata identifier of the entity definition. Example: "70816501-edb9-4740-a16c-6a5efbc05d84"'),
        logical_name: z.string().optional().describe('Logical (schema) name of the entity, e.g. "account".'),
        entity_set_name: z.string().optional().describe('Entity set name used in Web API URLs, e.g. "accounts".'),
        display_name: z.string().optional().describe('Localized display name of the entity, e.g. "Account". Omitted when the entity has no localized label.'),
        is_custom_entity: z.boolean().optional().describe('Whether the entity is flagged as custom (true) or system-provided (false).'),
        object_type_code: z.number().optional().describe('Object type code of the entity, e.g. 1 for account.'),
        is_activity: z.boolean().optional().describe('Whether the entity is an activity entity (e.g. task, email, phonecall).')
    })
    .describe(
        'Metadata for a single entity (table). Attributes beyond the ones listed, including custom metadata attributes requested via select, are passed through unchanged using their raw provider attribute names.'
    );

const OutputSchema = z
    .object({
        entity_definitions: z.array(EntityDefinitionSchema).describe('One entry per entity (table) defined in the org, including custom entities.')
    })
    .describe('Entity (table) metadata defined in the org.');

/**
 * @tags: [read]
 * @tagReason: Only reads entity (table) metadata through the Dataverse Web API; it never creates, updates, or deletes anything in the org.
 * @pitfalls: An unfiltered call returns the org's entire entity catalog in a single response (nearly 2,000 entries observed in a test org) and offers no way to page or limit, so use filter and select to trim results. Filtering with "IsCustomEntity eq false" does not return only the well-known CRM tables — both true and false include many internal platform entities, so cross-reference entity names to pick business tables.
 */
const action = createAction({
    description: 'List metadata for all entities (tables) defined in the org, including custom entities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requested = input.select ?? DEFAULT_SELECT;
        // $select is case-sensitive in Dataverse, so a caller-supplied variant of MetadataId in
        // the wrong case (e.g. "metadataId") must be replaced with the canonical "MetadataId"
        // rather than appended alongside it, otherwise the wrong-cased field is sent to the
        // provider and MetadataId is not actually requested.
        const hasMetadataId = requested.some((field) => field.toLowerCase() === 'metadataid');
        const selectFields = hasMetadataId
            ? requested.map((field) => (field.toLowerCase() === 'metadataid' ? 'MetadataId' : field))
            : [...requested, 'MetadataId'];

        const definitions: z.infer<typeof RawEntityDefinitionSchema>[] = [];
        let endpoint = '/api/data/v9.2/EntityDefinitions';
        let params: Record<string, string> = {
            $select: selectFields.join(','),
            ...(input.filter !== undefined ? { $filter: input.filter } : {})
        };
        let followNextLink = true;

        while (followNextLink) {
            const config: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-metadata-web-api
                endpoint,
                params,
                retries: 3
            };
            const response = await nango.get(config);
            const parsed = RawEntityDefinitionsResponseSchema.parse(response.data);
            definitions.push(...parsed.value);

            const nextLink = parsed['@odata.nextLink'];
            if (nextLink) {
                const nextUrl = new URL(nextLink);
                endpoint = nextUrl.pathname;
                params = Object.fromEntries(nextUrl.searchParams.entries());
            } else {
                followNextLink = false;
            }
        }

        return {
            entity_definitions: definitions.map((definition) => {
                const displayName = definition.DisplayName?.UserLocalizedLabel?.Label ?? definition.DisplayName?.LocalizedLabels?.[0]?.Label;
                const extraFields = Object.fromEntries(Object.entries(definition).filter(([key]) => !KNOWN_ENTITY_DEFINITION_KEYS.has(key)));
                return {
                    ...extraFields,
                    metadata_id: definition.MetadataId,
                    ...(definition.LogicalName != null && { logical_name: definition.LogicalName }),
                    ...(definition.EntitySetName != null && { entity_set_name: definition.EntitySetName }),
                    ...(displayName != null && { display_name: displayName }),
                    ...(definition.IsCustomEntity != null && { is_custom_entity: definition.IsCustomEntity }),
                    ...(definition.ObjectTypeCode != null && { object_type_code: definition.ObjectTypeCode }),
                    ...(definition.IsActivity != null && { is_activity: definition.IsActivity })
                };
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
