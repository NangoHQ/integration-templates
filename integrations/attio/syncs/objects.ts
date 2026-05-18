import { createSync } from 'nango';
import { z } from 'zod';

const ObjectIdSchema = z.object({
    workspace_id: z.string().describe('A UUID to identify the workspace this object belongs to.'),
    object_id: z.string().describe('A UUID to identify the object.')
});

const ProviderObjectSchema = z.object({
    id: ObjectIdSchema,
    api_slug: z.string().nullable().describe('A unique, human-readable slug to access the object through URLs and API calls. Formatted in snake case.'),
    singular_noun: z.string().nullable().describe("The singular form of the object's name."),
    plural_noun: z.string().nullable().describe("The plural form of the object's name."),
    created_at: z.string().describe('When the object was created.')
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderObjectSchema)
});

const AttioObjectSchema = z.object({
    id: z.string().describe('The object_id UUID.'),
    workspace_id: z.string().describe('A UUID to identify the workspace this object belongs to.'),
    api_slug: z.string().optional().describe('A unique, human-readable slug to access the object through URLs and API calls.'),
    singular_noun: z.string().optional().describe("The singular form of the object's name."),
    plural_noun: z.string().optional().describe("The plural form of the object's name."),
    created_at: z.string().describe('When the object was created.')
});

const sync = createSync({
    description: 'Sync objects from Attio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/objects'
        }
    ],
    scopes: ['object_configuration:read'],
    models: {
        AttioObject: AttioObjectSchema
    },

    exec: async (nango) => {
        // Provider limitation: GET /v2/objects has no pagination parameters
        // (no limit, offset, cursor), no filtering parameters (no updated_after,
        // modified_since), and returns all workspace objects in a single
        // response without any resume state. The dataset is small (workspace
        // configuration objects only), so we use full refresh with deletion
        // tracking.
        await nango.trackDeletesStart('AttioObject');

        // https://docs.attio.com/rest-api/endpoint-reference/objects/list-objects
        const response = await nango.get({
            endpoint: '/v2/objects',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const objects = parsed.data.map((obj) => ({
            id: obj.id.object_id,
            workspace_id: obj.id.workspace_id,
            ...(obj.api_slug != null && { api_slug: obj.api_slug }),
            ...(obj.singular_noun != null && { singular_noun: obj.singular_noun }),
            ...(obj.plural_noun != null && { plural_noun: obj.plural_noun }),
            created_at: obj.created_at
        }));

        if (objects.length > 0) {
            await nango.batchSave(objects, 'AttioObject');
        }

        await nango.trackDeletesEnd('AttioObject');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
