import type { LinkedInMessage, NangoSync, ProxyConfiguration } from '../../models.js';

/**
 * LinkedIn Messages Sync
 *
 * This sync captures all LinkedIn messages for archiving purposes,
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const twentyEightDaysAgo = Date.now() - 28 * 24 * 60 * 60 * 1000; // 28 days ago
    const lastProcessedAt = nango.lastSyncDate ?? twentyEightDaysAgo;

    const config: ProxyConfiguration = {
        //https://learn.microsoft.com/en-us/linkedin/dma/member-data-portability/shared/member-changelog-api?view=li-dma-data-portability-2025-02&tabs=curl
        endpoint: '/rest/memberChangeLogs',
        params: {
            q: 'memberAndApplication',
            count: '50',
            startTime: lastProcessedAt.toString()
        },
        headers: {
            'LinkedIn-Version': '202312',
            'Content-Type': 'application/json'
        },
        paginate: {
            type: 'offset',
            offset_name_in_request: 'start',
            offset_start_value: 0,
            offset_calculation_method: 'per-page',
            limit_name_in_request: 'count',
            response_path: 'elements',
            limit: 50
        },
        retries: 10
    };

    let latestProcessedAt = lastProcessedAt;
    let totalCreated = 0;
    let totalDeleted = 0;

    await nango.log(`Starting LinkedIn message sync from timestamp: ${new Date(lastProcessedAt).toISOString()}`);

    for await (const eventsPage of nango.paginate(config)) {
        const messageEvents = eventsPage.filter((event) => event.resourceName === 'messages');

        if (messageEvents.length > 0) {
            const messages: LinkedInMessage[] = messageEvents.map((event) => {
                const baseMessage = {
                    id: event.id,
                    resourceId: event.resourceId,
                    method: event.method,
                    owner: event.owner,
                    actor: event.actor,
                    activityId: event.activityId,
                    processedAt: event.processedAt,
                    capturedAt: event.capturedAt,
                    activityStatus: event.activityStatus,
                    thread: event.activity.thread || null,
                    author: event.activity.author || null,
                    createdAt: event.activity.createdAt || null,
                    configVersion: event.configVersion || null
                };

                if (event.method === 'DELETE') {
                    totalDeleted++;
                    // documented as having empty content in docs but contai additional nested objects in actual response
                    const { activity, processedActivity } = event;

                    return {
                        ...baseMessage,
                        isDeleted: true,
                        deletedAt: activity.createdAt || event.capturedAt,
                        activityData: activity,
                        processedActivity
                    };
                } else {
                    totalCreated++;

                    return {
                        ...baseMessage,
                        isDeleted: false,
                        content: event.activity.content || null,
                        deliveredAt: event.activity.deliveredAt,
                        mailbox: event.activity.mailbox,
                        contentClassification: event.activity.contentClassification || null,
                        attachments: event.activity.attachments || [],
                        contentUrns: event.activity.contentUrns || undefined,
                        messageContexts: event.activity.messageContexts || [],
                        extensionContent: event.activity.extensionContent || null,
                        processedActivity: event.processedActivity || null
                    };
                }
            });
            await nango.batchSave<LinkedInMessage>(messages, 'LinkedInMessage');
        }
        latestProcessedAt = Math.max(...eventsPage.map((event) => event.processedAt));
    }
    // TODO: NOTE.If there is no event from the previous response, keep the same startTime for the next request.
    // nango.lastSyncdate should handle this but optionally save to track from metadata if needed.

    await nango.log(
        `Sync complete: ${totalCreated} messages created, ${totalDeleted} messages deleted. Latest processedAt: ${new Date(latestProcessedAt).toISOString()}`
    );
}
