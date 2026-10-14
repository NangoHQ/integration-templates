import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const PhysicalCardSchema = z.object({
    id: z.string(),
    state: z.string().optional(),
    is_suspended: z.boolean().optional(),
    cardholder_id: z.string().optional(),
    cardholder_name: z.string().optional(),
    fund_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    fulfillment: z
        .object({
            fulfillment_status: z.string().optional()
        })
        .nullable()
        .optional()
});

const VirtualCardSchema = z.object({
    id: z.string(),
    fund_id: z.string().nullable().optional(),
    user_id: z.string().optional(),
    is_card_suspended: z.boolean().optional(),
    created_at: z.string().optional()
});

const CardSchema = z
    .object({
        id: z.string().describe('Unique identifier of the card.'),
        card_type: z
            .enum(['PHYSICAL', 'VIRTUAL'])
            .describe('Whether the card is a physical card (from /developer/v1/cards/physical) or a virtual card (from /developer/v1/cards/virtual).'),
        is_suspended: z
            .boolean()
            .describe(
                'Whether the card is currently suspended. Normalized from the physical resource is_suspended field and the virtual resource is_card_suspended field.'
            ),
        state: z
            .string()
            .optional()
            .describe('Physical card state, e.g. ACTIVE, CHIP_LOCKED, SUSPENDED, TERMINATED, UNACTIVATED. Only present for physical cards.'),
        cardholder_id: z.string().optional().describe('Unique identifier of the card holder. Only present for physical cards.'),
        cardholder_name: z.string().optional().describe("Card holder's full name. Only present for physical cards."),
        fulfillment_status: z
            .string()
            .optional()
            .describe('Fulfillment status of the physical card, e.g. ISSUED, ORDERED, SHIPPED, DELIVERED. Only present for physical cards.'),
        fund_id: z.string().optional().describe('Unique identifier of the fund associated with the card.'),
        user_id: z.string().optional().describe('Unique identifier of the user who owns the virtual card. Only present for virtual cards.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp at which the card was created.')
    })
    .describe('A physical or virtual Ramp card, unified into a single roster record.');

type CardRecord = z.infer<typeof CardSchema>;

const CheckpointSchema = z.object({
    collection: z
        .string()
        .describe('Which Ramp card collection is currently being scanned during a resumable full refresh, or an empty string when none is in progress.'),
    start: z.string().describe('Ramp pagination cursor extracted from `page.next`, or an empty string when the current collection scan is at its first page.')
});

const mapPhysicalCard = (item: unknown): CardRecord => {
    const card = PhysicalCardSchema.parse(item);

    return {
        id: card.id,
        card_type: 'PHYSICAL',
        is_suspended: card.is_suspended ?? false,
        ...(card.state != null && { state: card.state }),
        ...(card.cardholder_id != null && { cardholder_id: card.cardholder_id }),
        ...(card.cardholder_name != null && { cardholder_name: card.cardholder_name }),
        ...(card.fulfillment?.fulfillment_status != null && { fulfillment_status: card.fulfillment.fulfillment_status }),
        ...(card.fund_id != null && { fund_id: card.fund_id }),
        ...(card.created_at != null && { created_at: card.created_at })
    };
};

const mapVirtualCard = (item: unknown): CardRecord => {
    const card = VirtualCardSchema.parse(item);

    return {
        id: card.id,
        card_type: 'VIRTUAL',
        is_suspended: card.is_card_suspended ?? false,
        ...(card.fund_id != null && { fund_id: card.fund_id }),
        ...(card.user_id != null && { user_id: card.user_id }),
        ...(card.created_at != null && { created_at: card.created_at })
    };
};

const sync = createSync({
    description: 'Sync both physical and virtual cards into one unified card roster sync.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Card: CardSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const rawResumeCollection = typeof checkpoint?.['collection'] === 'string' && checkpoint['collection'] !== '' ? checkpoint['collection'] : undefined;
        const resumeCollection = rawResumeCollection === 'physical' || rawResumeCollection === 'virtual' ? rawResumeCollection : undefined;
        const resumeStart = typeof checkpoint?.['start'] === 'string' && checkpoint['start'] !== '' ? checkpoint['start'] : undefined;

        // Full refresh: neither /cards/physical nor /cards/virtual exposes a
        // date/incremental filter (confirmed live against both endpoints), so the
        // whole roster is re-fetched every run and Nango computes deletions from the
        // diff. trackDeletesStart/End wrap both sub-fetches so their union forms the
        // complete Card dataset. Persist which collection and page cursor are in flight
        // so an interrupted full scan can resume instead of starting over.
        await nango.trackDeletesStart('Card');

        const syncCollection = async ({
            collection,
            endpoint,
            start,
            mapCard
        }: {
            collection: 'physical' | 'virtual';
            endpoint: string;
            start: string | undefined;
            mapCard: (item: unknown) => CardRecord;
        }) => {
            let nextStart = start;

            const proxyConfig: ProxyConfiguration = {
                // Ramp API docs: GET /developer/v1/cards/physical - https://docs.ramp.com/openapi/developer-api.json
                // Ramp API docs: GET /developer/v1/cards/virtual - https://docs.ramp.com/openapi/developer-api.json
                endpoint,
                params: {
                    ...(nextStart !== undefined ? { start: nextStart } : {})
                },
                paginate: {
                    type: 'link',
                    link_path_in_response_body: 'page.next',
                    response_path: 'data',
                    limit_name_in_request: 'page_size',
                    limit: 100,
                    on_page: async ({ nextPageParam }) => {
                        nextStart =
                            typeof nextPageParam === 'string'
                                ? (new URL(nextPageParam, 'https://ramp.invalid').searchParams.get('start') ?? undefined)
                                : undefined;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                const cards = page.map(mapCard);

                if (cards.length > 0) {
                    await nango.batchSave(cards, 'Card');
                }

                if (nextStart !== undefined) {
                    await nango.saveCheckpoint({ collection, start: nextStart });
                }
            }
        };

        if (resumeCollection !== 'virtual') {
            await syncCollection({
                collection: 'physical',
                // Ramp API docs: GET /developer/v1/cards/physical - https://docs.ramp.com/openapi/developer-api.json
                endpoint: '/developer/v1/cards/physical',
                start: resumeCollection === 'physical' ? resumeStart : undefined,
                mapCard: mapPhysicalCard
            });

            await nango.saveCheckpoint({ collection: 'virtual', start: '' });
        }

        await syncCollection({
            collection: 'virtual',
            // Ramp API docs: GET /developer/v1/cards/virtual - https://docs.ramp.com/openapi/developer-api.json
            endpoint: '/developer/v1/cards/virtual',
            start: resumeCollection === 'virtual' ? resumeStart : undefined,
            mapCard: mapVirtualCard
        });

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Card');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
