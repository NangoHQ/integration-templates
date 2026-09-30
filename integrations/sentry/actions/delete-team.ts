import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        organization_id_or_slug: z.string().describe('The ID or slug of the organization the team belongs to. Example: "nangodev"'),
        team_id_or_slug: z.string().describe('The ID or slug of the team to delete. Example: "my-team-slug"')
    })
    .describe('Identifies the team to delete by its organization and team ID or slug');

const OutputSchema = z.null().describe('Always null: the provider responds with 204 No Content on successful deletion');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a team in the provider, a difficult-to-reverse mutation.
 * @pitfalls: Deletion is asynchronous: the team can still appear in list and get responses briefly after a successful call, while its slug is released immediately and can be taken by a new team. The auth token needs the team:admin scope; tokens without it get a 403 even when the acting user is an organization owner.
 */
const action = createAction({
    description: 'Delete a team',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.sentry.io/api/teams/delete-a-team/
        await nango.delete({
            endpoint: `/0/teams/${encodeURIComponent(input.organization_id_or_slug)}/${encodeURIComponent(input.team_id_or_slug)}/`,
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
