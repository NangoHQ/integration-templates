import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    person_id: z.string().describe('Person ID (numeric ID or UUID). Example: "28326843662" or "1842ea50-563c-5ead-88e8-88d3ad56983d"'),
    properties: z.object({}).passthrough().optional().describe('Properties to update on the person')
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    distinct_ids: z.array(z.string()).nullable().optional(),
    properties: z.object({}).passthrough().nullable().optional(),
    created_at: z.string().nullable().optional(),
    uuid: z.string().nullable().optional(),
    last_seen_at: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    distinct_ids: z.array(z.string()).optional(),
    properties: z.object({}).passthrough().optional(),
    created_at: z.string().optional(),
    uuid: z.string().optional(),
    last_seen_at: z.string().optional()
});

const action = createAction({
    description: 'Update a person in PostHog.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-person',
        group: 'Persons'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['person:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        // https://posthog.com/docs/api/persons
        await nango.patch({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/persons/${encodeURIComponent(input.person_id)}/`,
            data: {
                ...(input.properties !== undefined && { properties: input.properties })
            },
            retries: 3
        });

        // https://posthog.com/docs/api/persons
        const getResponse = await nango.get({
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/persons/${encodeURIComponent(input.person_id)}/`,
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Person not found after update.',
                person_id: input.person_id
            });
        }

        const providerPerson = ProviderPersonSchema.parse(getResponse.data);

        return {
            id: providerPerson.id,
            ...(providerPerson.name != null && { name: providerPerson.name }),
            ...(providerPerson.distinct_ids != null && { distinct_ids: providerPerson.distinct_ids }),
            ...(providerPerson.properties != null && { properties: providerPerson.properties }),
            ...(providerPerson.created_at != null && { created_at: providerPerson.created_at }),
            ...(providerPerson.uuid != null && { uuid: providerPerson.uuid }),
            ...(providerPerson.last_seen_at != null && { last_seen_at: providerPerson.last_seen_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
