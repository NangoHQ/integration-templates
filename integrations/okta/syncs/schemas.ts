import { createSync } from 'nango';
import { z } from 'zod';

const UserTypeSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string(),
    description: z.string().nullable().optional(),
    default: z.boolean().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    createdBy: z.string().optional(),
    lastUpdatedBy: z.string().optional(),
    _links: z.object({
        schema: z.object({
            href: z.string()
        })
    })
});

const UserSchemaResponseSchema = z.object({
    id: z.string(),
    $schema: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    definitions: z.record(z.string(), z.unknown()).optional(),
    type: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional()
});

const SchemaSchema = z.object({
    id: z.string(),
    name: z.string(),
    displayName: z.string(),
    description: z.string().optional(),
    default: z.boolean().optional(),
    created: z.string().optional(),
    lastUpdated: z.string().optional(),
    schemaVersion: z.string().optional(),
    title: z.string().optional(),
    definitions: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync user schemas/types.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    scopes: ['okta.schemas.read', 'okta.userTypes.read'],
    models: {
        Schema: SchemaSchema
    },

    exec: async (nango) => {
        // Blocker: The Okta Management API does not expose changed-since filters,
        // deleted-record endpoints, cursors, or page tokens on /api/v1/meta/types/user
        // or /api/v1/meta/schemas/user/{schemaId}. These endpoints always return the
        // complete current state, so a full snapshot with delete tracking is required.

        // https://developer.okta.com/docs/api/openapi/okta-management/management/tags/usertype/other/listusertypes
        const userTypesResponse = await nango.get({
            endpoint: '/api/v1/meta/types/user',
            retries: 3
        });

        const parsedUserTypes = z.array(UserTypeSchema).safeParse(userTypesResponse.data);
        if (!parsedUserTypes.success) {
            throw new Error(`Failed to parse user types: ${parsedUserTypes.error.message}`);
        }

        const userTypes = parsedUserTypes.data;
        const schemas: z.infer<typeof SchemaSchema>[] = [];

        await nango.trackDeletesStart('Schema');

        for (const userType of userTypes) {
            const schemaHref = userType._links.schema.href;
            const schemaId = schemaHref.split('/').pop();
            if (!schemaId) {
                throw new Error(`Failed to extract schemaId from href: ${schemaHref}`);
            }

            // https://developer.okta.com/docs/api/openapi/okta-management/management/tags/schema/other/getuserschema
            const schemaResponse = await nango.get({
                endpoint: `/api/v1/meta/schemas/user/${encodeURIComponent(schemaId)}`,
                retries: 3
            });

            const parsedSchema = UserSchemaResponseSchema.safeParse(schemaResponse.data);
            if (!parsedSchema.success) {
                throw new Error(`Failed to parse schema ${schemaId}: ${parsedSchema.error.message}`);
            }

            const schemaData = parsedSchema.data;

            schemas.push({
                id: schemaData.id,
                name: userType.name,
                displayName: userType.displayName,
                ...(userType.description != null && { description: userType.description }),
                default: userType.default,
                created: schemaData.created ?? userType.created,
                lastUpdated: schemaData.lastUpdated ?? userType.lastUpdated,
                schemaVersion: schemaData.$schema,
                title: schemaData.title,
                definitions: schemaData.definitions
            });
        }

        if (schemas.length > 0) {
            await nango.batchSave(schemas, 'Schema');
        }

        await nango.trackDeletesEnd('Schema');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
