import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('PostHog project ID. Example: 309484'),
    id: z.string().describe('Person ID (numeric ID or UUID). Example: "28326788283"')
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    distinct_ids: z.array(z.string()),
    properties: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.string(),
    uuid: z.string(),
    last_seen_at: z.string().nullable()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    distinct_ids: z.array(z.string()),
    properties: z.record(z.string(), z.unknown()).optional(),
    created_at: z.string(),
    uuid: z.string(),
    last_seen_at: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single person from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['person:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://posthog.com/docs/api/persons
            endpoint: `/api/projects/${encodeURIComponent(String(input.project_id))}/persons/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Person not found',
                person_id: input.id
            });
        }

        const providerPerson = ProviderPersonSchema.parse(response.data);

        return {
            id: providerPerson.id,
            ...(providerPerson.name != null && { name: providerPerson.name }),
            distinct_ids: providerPerson.distinct_ids,
            ...(providerPerson.properties != null && { properties: providerPerson.properties }),
            created_at: providerPerson.created_at,
            uuid: providerPerson.uuid,
            ...(providerPerson.last_seen_at != null && { last_seen_at: providerPerson.last_seen_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
