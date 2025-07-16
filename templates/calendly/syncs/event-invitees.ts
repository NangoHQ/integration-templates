import { createSync } from "nango";
import { EventInvitee } from "../models.js";
import { z } from "zod";

const sync = createSync({
    description: "For all events (active and canceled) retrieve the event invitees",
    version: "1.0.0",
    frequency: "every hour",
    autoStart: true,
    syncType: "incremental",
    trackDeletes: false,

    endpoints: [{
        method: "GET",
        path: "/event/invitees"
    }],

    models: {
        EventInvitee: EventInvitee
    },

    metadata: z.object({}),

    exec: async nango => {
        const connection = await nango.getConnection();

        const userId = connection.connection_config['owner'];

        if (!userId) {
            throw new Error('No user id found');
        }

        for await (const eventResponse of nango.paginate({
            // https://developer.calendly.com/api-docs/eb8ee72701f99-list-event-invitees
            endpoint: '/scheduled_events',
            params: {
                user: userId
            },
            paginate: {
                response_path: 'collection'
            },
            retries: 10
        })) {
            const eventInvitees: EventInvitee[] = [];
            for (const event of eventResponse) {
                const eventUri = event.uri;
                const segments = eventUri.split('/');
                const uuid = segments.pop();
                for await (const eventInviteeResponse of nango.paginate({
                    endpoint: `/scheduled_events/${uuid}/invitees`,
                    paginate: {
                        response_path: 'collection'
                    }
                })) {
                    const invitees = eventInviteeResponse.map((invitee) => {
                        return {
                            ...invitee,
                            id: invitee.uri.split('/').pop()
                        };
                    });

                    eventInvitees.push(...invitees);
                }
            }
            await nango.batchSave(eventInvitees, 'EventInvitee');
        }
    }
});

export type NangoSyncLocal = Parameters<typeof sync["exec"]>[0];
export default sync;
