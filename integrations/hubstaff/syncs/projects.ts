import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.number()
});

const ProviderProjectSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    status: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string(),
    organization_id: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OrganizationListResponseSchema = z.object({
    organizations: z.array(OrganizationSchema),
    pagination: z
        .object({
            next_page_start_id: z.union([z.string(), z.number()]).optional()
        })
        .optional()
});

const ProjectListResponseSchema = z.object({
    projects: z.array(ProviderProjectSchema),
    pagination: z
        .object({
            next_page_start_id: z.union([z.string(), z.number()]).optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    org_page_start_id: z.string(),
    org_ids_json: z.string(),
    current_org_index: z.number(),
    project_page_start_id: z.string()
});

const sync = createSync({
    description: 'Sync projects across all organizations this connection can access.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = rawCheckpoint === null || rawCheckpoint === undefined ? null : CheckpointSchema.safeParse(rawCheckpoint);
        const checkpoint = checkpointResult?.success
            ? checkpointResult.data
            : {
                  org_page_start_id: '',
                  org_ids_json: '[]',
                  current_org_index: 0,
                  project_page_start_id: ''
              };

        const orgIdSet = new Set<number>(JSON.parse(checkpoint.org_ids_json));
        let orgIds = Array.from(orgIdSet);

        // Start (or resume) the full-refresh deletion window before making any
        // provider requests, including organization discovery.
        await nango.trackDeletesStart('Project');

        // Phase 1: Discover organizations (checkpointed).
        if (orgIds.length === 0 || checkpoint.org_page_start_id !== '') {
            let orgPageStartId = checkpoint.org_page_start_id;

            while (true) {
                const params: Record<string, string | number> = { page_limit: 100 };
                if (orgPageStartId !== '') {
                    params['page_start_id'] = orgPageStartId;
                }

                const orgsProxyConfig: ProxyConfiguration = {
                    // https://developer.hubstaff.com/
                    endpoint: 'v2/organizations',
                    params,
                    retries: 3
                };

                const response = await nango.get(orgsProxyConfig);
                const parsedResponse = OrganizationListResponseSchema.safeParse(response.data);
                if (!parsedResponse.success) {
                    throw new Error(`Failed to parse organizations response: ${parsedResponse.error.message}`);
                }

                for (const rawOrg of parsedResponse.data.organizations) {
                    orgIdSet.add(rawOrg.id);
                }
                orgIds = Array.from(orgIdSet);

                const nextCursor = parsedResponse.data.pagination?.next_page_start_id;
                if (nextCursor === undefined || nextCursor === null || nextCursor === '') {
                    break;
                }

                orgPageStartId = String(nextCursor);
                await nango.saveCheckpoint({
                    org_page_start_id: orgPageStartId,
                    org_ids_json: JSON.stringify(orgIds),
                    current_org_index: 0,
                    project_page_start_id: ''
                });
            }

            // All organizations discovered; save checkpoint to begin project fetching.
            await nango.saveCheckpoint({
                org_page_start_id: '',
                org_ids_json: JSON.stringify(orgIds),
                current_org_index: 0,
                project_page_start_id: ''
            });
        }

        // Phase 2: Fetch projects for each organization (checkpointed).
        const startOrgIndex = checkpoint.current_org_index;
        for (let i = startOrgIndex; i < orgIds.length; i++) {
            const orgId = orgIds[i];
            if (orgId === undefined) {
                continue;
            }
            let projectPageStartId = i === startOrgIndex ? checkpoint.project_page_start_id : '';

            while (true) {
                const params: Record<string, string | number> = { page_limit: 100 };
                if (projectPageStartId !== '') {
                    params['page_start_id'] = projectPageStartId;
                }

                const projectsProxyConfig: ProxyConfiguration = {
                    // https://developer.hubstaff.com/
                    endpoint: `v2/organizations/${encodeURIComponent(String(orgId))}/projects`,
                    params,
                    retries: 3
                };

                const response = await nango.get(projectsProxyConfig);
                const parsedResponse = ProjectListResponseSchema.safeParse(response.data);
                if (!parsedResponse.success) {
                    throw new Error(`Failed to parse projects response: ${parsedResponse.error.message}`);
                }

                const projects: z.infer<typeof ProjectSchema>[] = [];

                for (const raw of parsedResponse.data.projects) {
                    const parsed = ProviderProjectSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse project: ${parsed.error.message}`);
                    }

                    projects.push({
                        id: String(parsed.data.id),
                        name: parsed.data.name,
                        status: parsed.data.status,
                        organization_id: orgId,
                        ...(parsed.data.created_at && { created_at: parsed.data.created_at }),
                        ...(parsed.data.updated_at && { updated_at: parsed.data.updated_at })
                    });
                }

                if (projects.length > 0) {
                    await nango.batchSave(projects, 'Project');
                }

                const nextCursor = parsedResponse.data.pagination?.next_page_start_id;
                if (nextCursor === undefined || nextCursor === null || nextCursor === '') {
                    break;
                }

                projectPageStartId = String(nextCursor);
                await nango.saveCheckpoint({
                    org_page_start_id: '',
                    org_ids_json: JSON.stringify(orgIds),
                    current_org_index: i,
                    project_page_start_id: projectPageStartId
                });
            }

            // Finished this org; advance checkpoint to the next one if any remain.
            if (i < orgIds.length - 1) {
                await nango.saveCheckpoint({
                    org_page_start_id: '',
                    org_ids_json: JSON.stringify(orgIds),
                    current_org_index: i + 1,
                    project_page_start_id: ''
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Project');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
