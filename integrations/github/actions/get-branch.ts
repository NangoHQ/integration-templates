import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    owner: z.string().describe('Repository owner. Example: "octocat"'),
    repo: z.string().describe('Repository name. Example: "Hello-World"'),
    branch: z.string().describe('Branch name. Example: "main"')
});

const ProviderCommitSchema = z.object({
    sha: z.string(),
    url: z.string().optional(),
    node_id: z.string().optional()
});

const ProviderProtectionRequiredStatusCheckSchema = z
    .object({
        enforcement_level: z.string().optional(),
        contexts: z.array(z.string()).optional(),
        checks: z.array(z.unknown()).optional()
    })
    .passthrough();

const ProviderProtectionSchema = z
    .object({
        enabled: z.boolean().optional(),
        required_status_checks: ProviderProtectionRequiredStatusCheckSchema.optional().nullable(),
        enforce_admins: z.unknown().optional().nullable(),
        required_pull_request_reviews: z.unknown().optional().nullable(),
        restrictions: z.unknown().optional().nullable()
    })
    .passthrough();

const ProviderBranchSchema = z
    .object({
        name: z.string(),
        commit: ProviderCommitSchema,
        protected: z.boolean().optional(),
        protection: ProviderProtectionSchema.optional().nullable(),
        protection_url: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    name: z.string(),
    commit_sha: z.string(),
    protected: z.boolean().optional(),
    protection: z.unknown().optional()
});

const action = createAction({
    description: 'Retrieve branch metadata and protection status.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-branch',
        group: 'Branches'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['repo'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.github.com/en/rest/branches/branches#get-a-branch
        const response = await nango.get({
            endpoint: `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/branches/${encodeURIComponent(input.branch)}`,
            retries: 3
        });

        const branch = ProviderBranchSchema.parse(response.data);

        return {
            name: branch.name,
            commit_sha: branch.commit.sha,
            protected: branch.protected,
            ...(branch.protection && { protection: branch.protection })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
