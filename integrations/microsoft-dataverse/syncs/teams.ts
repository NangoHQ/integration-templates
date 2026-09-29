import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 100;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const TeamSchema = z
    .object({
        id: z.string().describe('Unique identifier of the team (Dataverse teamid GUID). Example: "5e3835b4-9bb2-f111-aaac-000d3a3bd5b5".'),
        name: z.string().optional().describe('Display name of the team. Example: "org98374485".'),
        description: z.string().optional().describe('Free-text description of the team.'),
        teamtype: z
            .number()
            .optional()
            .describe('Team type option-set value: 0 = Owner, 1 = Access, 2 = Microsoft Entra security group, 3 = Microsoft Entra Office group.'),
        isdefault: z.boolean().optional().describe('Whether the team is the default team of its business unit.'),
        businessunitid: z.string().optional().describe('GUID of the business unit the team belongs to.'),
        administratorid: z.string().optional().describe('GUID of the systemuser who administers the team.'),
        createdon: z.string().optional().describe('ISO 8601 timestamp of when the team was created. Example: "2026-09-17T13:28:51Z".'),
        modifiedon: z
            .string()
            .describe(
                'ISO 8601 timestamp of when the team was last modified. The incremental sync cursor is the Dataverse versionnumber, not this field. Example: "2026-09-17T13:28:57Z".'
            )
    })
    .describe('A Microsoft Dataverse team (entity set: teams).');

const CheckpointSchema = z.object({
    lastVersionNumber: z
        .number()
        .describe(
            'Dataverse versionnumber high-water mark of the last synced team; applied as $filter=versionnumber gt {value} on the next incremental run. versionnumber is a unique, monotonically increasing rowversion, so unlike modifiedon it never ties across a page boundary. 0 when no team has been synced yet.'
        ),
    lastFullRefresh: z
        .string()
        .describe('ISO 8601 timestamp of the last completed full refresh used for delete detection. Empty string when no full refresh has completed yet.')
});

const TeamRecordSchema = z
    .object({
        teamid: z.string(),
        versionnumber: z.number(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        teamtype: z.number().nullish(),
        isdefault: z.boolean().nullish(),
        _businessunitid_value: z.string().nullish(),
        _administratorid_value: z.string().nullish(),
        createdon: z.string().nullish(),
        modifiedon: z.string()
    })
    .passthrough();

const TeamsResponseSchema = z
    .object({
        value: z.array(TeamRecordSchema)
    })
    .passthrough();

type Team = z.infer<typeof TeamSchema>;
type TeamRecord = z.infer<typeof TeamRecordSchema>;

function toTeam(record: TeamRecord): Team {
    return {
        id: record.teamid,
        ...(record.name != null && { name: record.name }),
        ...(record.description != null && { description: record.description }),
        ...(record.teamtype != null && { teamtype: record.teamtype }),
        ...(record.isdefault != null && { isdefault: record.isdefault }),
        ...(record._businessunitid_value != null && { businessunitid: record._businessunitid_value }),
        ...(record._administratorid_value != null && { administratorid: record._administratorid_value }),
        ...(record.createdon != null && { createdon: record.createdon }),
        modifiedon: record.modifiedon
    };
}

const sync = createSync({
    description: 'Sync Microsoft Dataverse teams incrementally by versionnumber, with a periodic full refresh to detect deletions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const parsedCheckpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : undefined;

        const fetchTeamsPage = async (after: number | undefined): Promise<TeamRecord[]> => {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            const response = await nango.get({
                endpoint: '/api/data/v9.2/teams',
                params: {
                    $orderby: 'versionnumber asc',
                    $top: PAGE_SIZE,
                    ...(after !== undefined && { $filter: `versionnumber gt ${after}` })
                },
                retries: 3
            });
            const parsed = TeamsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                // Throwing here (instead of skipping) is required so a delete-tracked
                // full refresh can never mark an unparseable record as deleted.
                throw new Error(`Unexpected response shape from the Dataverse teams endpoint: ${parsed.error.message}`);
            }
            return parsed.data.value;
        };

        const lastFullRefresh = checkpoint?.lastFullRefresh ?? '';
        const lastFullRefreshTime = new Date(lastFullRefresh).getTime();
        // The Dataverse Web API exposes no deleted-records feed, so deletions are detected
        // by a periodic full refresh. That scan always starts from page 1 (no version
        // filter) and persists its checkpoint only once the whole scan completes, so an
        // interrupted run retries as a full refresh instead of silently turning incremental.
        const isFullRefresh = Number.isNaN(lastFullRefreshTime) || Date.now() - lastFullRefreshTime >= FULL_REFRESH_INTERVAL_MS;

        let after: number | undefined = isFullRefresh ? undefined : checkpoint?.lastVersionNumber || undefined;
        let maxVersionNumber: number | undefined;
        let hasMorePages = true;
        let isFirstPage = true;
        let deleteTrackingOpened = false;
        while (hasMorePages) {
            const records = await fetchTeamsPage(after);
            const last = records[records.length - 1];

            // Delete tracking opens only once the first page has been fetched, parsed, and
            // confirmed non-empty, so a failure or empty response before this point never leaves
            // the window open. An empty first page of a full refresh is treated as inconclusive,
            // not proof the table is empty, since acting on it would mark every previously synced
            // team as deleted.
            if (isFirstPage && isFullRefresh && last) {
                await nango.trackDeletesStart('Team');
                deleteTrackingOpened = true;
            }
            isFirstPage = false;

            if (!last) {
                // Empty page: nothing left to fetch.
                hasMorePages = false;
                continue;
            }
            await nango.batchSave(records.map(toTeam), 'Team');
            after = last.versionnumber;
            if (isFullRefresh) {
                maxVersionNumber = after;
            } else {
                await nango.saveCheckpoint({
                    lastVersionNumber: after,
                    lastFullRefresh
                });
            }
            hasMorePages = records.length === PAGE_SIZE;
        }

        if (deleteTrackingOpened) {
            await nango.trackDeletesEnd('Team');
            await nango.saveCheckpoint({
                lastVersionNumber: maxVersionNumber ?? 0,
                lastFullRefresh: new Date().toISOString()
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
