import { createSync, type ProxyConfiguration } from 'nango';
import * as z from 'zod';

const MetadataSchema = z
    .object({
        organizationId: z.string().min(1).describe('Organization containing the configured project.'),
        teamId: z.string().min(1).describe('Team containing the configured project.'),
        projectId: z.string().min(1).describe('Project whose individual memberships form the dataset.')
    })
    .describe('Connection metadata selecting the Miro organization, team, and project whose individual members are synced.');

const ProjectMemberSchema = z
    .object({
        id: z.string().describe('Opaque member ID within the configured project.'),
        organizationId: z.string().describe('Organization containing the project.'),
        teamId: z.string().describe('Team containing the project.'),
        projectId: z.string().describe('Project to which this member belongs.'),
        email: z.string().describe('Member email returned by Miro.'),
        role: z.enum(['owner', 'editor', 'viewer', 'commentator', 'coowner']).describe("Member's project role.")
    })
    .describe('Individual member of the configured Miro project, with the member email and project role.');

// Shape of one entry in the `data` array of the Miro project members page.
const MiroProjectMemberSchema = z.object({
    id: z.string(),
    email: z.string(),
    role: z.enum(['owner', 'editor', 'viewer', 'commentator', 'coowner']),
    type: z.string().optional()
});

type ProjectMember = z.infer<typeof ProjectMemberSchema>;

const sync = createSync({
    description: "Make a configured project's individual members, emails, and roles available as records. Requires Enterprise Company Admin access.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    scopes: ['projects:read'],
    metadata: MetadataSchema,
    models: {
        ProjectMember: ProjectMemberSchema
    },

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        // Full refresh: the project members endpoint has no changed-since filter and no
        // deleted-record feed, so every run re-lists the complete membership and the
        // delete-tracking window records removals. No cursor checkpoint is restored or
        // persisted mid-scan, so each run always walks the dataset from the first page.
        await nango.trackDeletesStart('ProjectMember');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.miro.com/reference/enterprise-get-project-members
            endpoint: `/v2/orgs/${encodeURIComponent(metadata.organizationId)}/teams/${encodeURIComponent(metadata.teamId)}/projects/${encodeURIComponent(metadata.projectId)}/members`,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const members: ProjectMember[] = [];
            for (const item of page) {
                // Throw on malformed data: skipping a record inside a delete-tracked
                // scan would falsely mark it as deleted.
                const member = MiroProjectMemberSchema.parse(item);
                members.push({
                    id: member.id,
                    organizationId: metadata.organizationId,
                    teamId: metadata.teamId,
                    projectId: metadata.projectId,
                    email: member.email,
                    role: member.role
                });
            }

            if (members.length > 0) {
                await nango.batchSave(members, 'ProjectMember');
            }
        }

        await nango.trackDeletesEnd('ProjectMember');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
