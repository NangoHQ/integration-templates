import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.number().describe('Action ID. Example: 123')
});

const StepPropertySchema = z.object({
    key: z.string().nullish(),
    type: z.string().nullish(),
    value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))]).nullish(),
    operator: z.string().nullish()
});

const StepSchema = z.object({
    event: z.string().nullish(),
    properties: z.array(StepPropertySchema).nullish(),
    selector: z.string().nullish(),
    selector_regex: z.string().nullish(),
    tag_name: z.string().nullish(),
    text: z.string().nullish(),
    text_matching: z.string().nullish(),
    href: z.string().nullish(),
    href_matching: z.string().nullish(),
    url: z.string().nullish(),
    url_matching: z.string().nullish()
});

const CreatedBySchema = z.object({
    id: z.number().nullish(),
    uuid: z.string().nullish(),
    distinct_id: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish(),
    is_email_verified: z.boolean().nullish(),
    hedgehog_config: z.object({}).passthrough().nullish(),
    role_at_organization: z.string().nullish()
});

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        tags: z.array(z.string()).nullish(),
        post_to_slack: z.boolean().nullish(),
        slack_message_format: z.string().nullish(),
        steps: z.array(StepSchema).nullish(),
        created_at: z.string().nullish(),
        created_by: CreatedBySchema.nullish(),
        deleted: z.boolean().nullish(),
        is_calculating: z.boolean().nullish(),
        last_calculated_at: z.string().nullish(),
        team_id: z.number().nullish(),
        is_action: z.boolean().nullish(),
        bytecode_error: z.string().nullish(),
        pinned_at: z.string().nullish(),
        creation_context: z.string().nullish(),
        _create_in_folder: z.string().nullish(),
        user_access_level: z.string().nullish()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single action from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['action:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        const response = await nango.get({
            // https://posthog.com/docs/api/actions
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/actions/${encodeURIComponent(String(input.id))}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Action not found',
                id: input.id
            });
        }

        const providerAction = OutputSchema.parse(response.data);
        return providerAction;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
