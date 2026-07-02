import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    last_imt_id: z.string()
});

const OrganizationSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional()
});

const TeamSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional()
});

const ScenarioSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    teamId: z.union([z.string(), z.number()]).optional()
});

const LogEntrySchema = z
    .object({
        imtId: z.union([z.string(), z.number()]),
        type: z.string(),
        scenarioId: z.union([z.string(), z.number()]).optional(),
        timestamp: z.string().optional(),
        duration: z.union([z.number(), z.string()]).optional(),
        status: z.number().optional(),
        error: z.string().optional()
    })
    .passthrough();

const ScenarioExecutionSchema = z.object({
    id: z.string().describe('Stable execution identifier (imtId)'),
    scenarioId: z.string().describe('Scenario ID'),
    imtId: z.string().describe('Monotonically increasing execution sequence ID'),
    timestamp: z.string().optional().describe('Execution timestamp'),
    duration: z.number().optional().describe('Execution duration in milliseconds'),
    status: z.string().optional().describe('Execution status (SUCCESS, WARNING, ERROR)'),
    error: z.string().optional().describe('Error message if failed')
});

const sync = createSync({
    description: 'Sync execution history (run logs) for each scenario in a team',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ScenarioExecution: ScenarioExecutionSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const rawImtId = checkpoint?.['last_imt_id'];
        const lastImtId = typeof rawImtId === 'string' ? rawImtId : undefined;

        // https://developers.make.com/api-documentation/
        const orgResponse = await nango.get({
            endpoint: '/organizations',
            retries: 3
        });

        const orgData = z
            .object({
                organizations: z.array(OrganizationSchema.passthrough())
            })
            .safeParse(orgResponse.data);

        if (!orgData.success || orgData.data.organizations.length === 0) {
            throw new Error('No organizations found');
        }

        let maxImtId: string | undefined = lastImtId;

        for (const org of orgData.data.organizations) {
            const orgId = String(org.id);

            // https://developers.make.com/api-documentation/
            const teamResponse = await nango.get({
                endpoint: '/teams',
                params: {
                    organizationId: orgId
                },
                retries: 3
            });

            const teamData = z
                .object({
                    teams: z.array(TeamSchema.passthrough())
                })
                .safeParse(teamResponse.data);

            if (!teamData.success || teamData.data.teams.length === 0) {
                continue;
            }

            for (const team of teamData.data.teams) {
                const teamId = String(team.id);

                const scenarioProxyConfig: ProxyConfiguration = {
                    // https://developers.make.com/api-documentation/
                    endpoint: '/scenarios',
                    params: {
                        teamId: teamId
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'pg[offset]',
                        offset_start_value: 0,
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'pg[limit]',
                        limit: 50,
                        response_path: 'scenarios'
                    },
                    retries: 3
                };

                const scenarios: Array<{ id: string }> = [];
                for await (const page of nango.paginate(scenarioProxyConfig)) {
                    const pageData = z.array(ScenarioSchema.passthrough()).safeParse(page);
                    if (!pageData.success) {
                        throw new Error(`Failed to parse scenarios page: ${pageData.error.message}`);
                    }
                    for (const scenario of pageData.data) {
                        scenarios.push({ id: String(scenario.id) });
                    }
                }

                for (const scenario of scenarios) {
                    const scenarioId = scenario.id;

                    const logProxyConfig: ProxyConfiguration = {
                        // https://developers.make.com/api-documentation/
                        endpoint: `/scenarios/${encodeURIComponent(scenarioId)}/logs`,
                        params: {
                            'pg[sortBy]': 'imtId',
                            'pg[sortDir]': 'desc'
                        },
                        paginate: {
                            type: 'offset',
                            offset_name_in_request: 'pg[offset]',
                            offset_start_value: 0,
                            offset_calculation_method: 'per-page',
                            limit_name_in_request: 'pg[limit]',
                            limit: 50,
                            response_path: 'scenarioLogs'
                        },
                        retries: 3
                    };

                    for await (const batch of nango.paginate(logProxyConfig)) {
                        const batchData = z.array(LogEntrySchema).safeParse(batch);
                        if (!batchData.success) {
                            throw new Error(`Failed to parse logs batch: ${batchData.error.message}`);
                        }

                        const executions = batchData.data
                            .filter((entry) => entry.type === 'EXECUTION_END')
                            .map((entry) => {
                                const imtId = String(entry.imtId);
                                const statusMap: Record<number, string> = { 1: 'SUCCESS', 2: 'WARNING', 3: 'ERROR' };
                                const status = typeof entry.status === 'number' ? statusMap[entry.status] : undefined;
                                const duration =
                                    typeof entry.duration === 'number'
                                        ? entry.duration
                                        : typeof entry.duration === 'string'
                                          ? Number(entry.duration)
                                          : undefined;

                                const record: {
                                    id: string;
                                    scenarioId: string;
                                    imtId: string;
                                    timestamp?: string;
                                    duration?: number;
                                    status?: string;
                                    error?: string;
                                } = {
                                    id: imtId,
                                    scenarioId: String(entry.scenarioId ?? scenarioId),
                                    imtId: imtId
                                };

                                if (entry.timestamp != null) {
                                    record.timestamp = entry.timestamp;
                                }
                                if (duration != null && !Number.isNaN(duration)) {
                                    record.duration = duration;
                                }
                                if (status != null) {
                                    record.status = status;
                                }
                                if (entry.error != null) {
                                    record.error = entry.error;
                                }

                                return record;
                            });

                        if (executions.length === 0) {
                            continue;
                        }

                        if (lastImtId != null) {
                            const lastImtIdNum = Number(lastImtId);
                            const newExecutions = executions.filter((e) => Number(e.imtId) > lastImtIdNum);
                            if (newExecutions.length > 0) {
                                await nango.batchSave(newExecutions, 'ScenarioExecution');
                                for (const e of newExecutions) {
                                    const eImtIdNum = Number(e.imtId);
                                    if (maxImtId == null || eImtIdNum > Number(maxImtId)) {
                                        maxImtId = e.imtId;
                                    }
                                }
                            }
                            const hasReachedCheckpoint = executions.some((e) => Number(e.imtId) <= lastImtIdNum);
                            if (hasReachedCheckpoint) {
                                break;
                            }
                        } else {
                            await nango.batchSave(executions, 'ScenarioExecution');
                            for (const e of executions) {
                                const eImtIdNum = Number(e.imtId);
                                if (maxImtId == null || eImtIdNum > Number(maxImtId)) {
                                    maxImtId = e.imtId;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (maxImtId != null) {
            await nango.saveCheckpoint({ last_imt_id: maxImtId });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
