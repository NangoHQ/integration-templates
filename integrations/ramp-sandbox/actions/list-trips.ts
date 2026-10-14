import { z } from 'zod';
import { createAction } from 'nango';

const TripStatusSchema = z.enum(['cancelled', 'completed', 'ongoing', 'upcoming']);

const TravelTypeSchema = z.enum(['CAR', 'FLIGHT', 'HOTEL']);

const SpendTypeSchema = z.enum(['BILL', 'REIMBURSEMENT', 'TRANSACTION']);

const ProviderTravelLocationSchema = z.object({
    city: z.string().nullable(),
    country: z.string().nullable(),
    state: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable()
});

const ProviderTripSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    status: TripStatusSchema,
    user_id: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    length_in_days: z.number(),
    locations: z.array(
        z.object({
            start_date: z.string(),
            end_date: z.string(),
            location: ProviderTravelLocationSchema
        })
    ),
    spend_events: z.array(
        z.object({
            id: z.string(),
            spend_type: SpendTypeSchema
        })
    ),
    travel_types: z.array(TravelTypeSchema),
    total_spend_amount: z
        .object({
            currency: z.string(),
            value: z.number()
        })
        .nullable()
});

const TravelLocationSchema = z.object({
    city: z.string().optional().describe('City name of the location. Omitted when unknown. Example: "Seattle"'),
    state: z.string().optional().describe('State or region code of the location. Omitted when unknown. Example: "WA"'),
    country: z.string().optional().describe('Country name of the location. Omitted when unknown. Example: "United States"'),
    latitude: z.number().optional().describe('Latitude of the location in decimal degrees. Omitted when unknown. Example: 47.6062095'),
    longitude: z.number().optional().describe('Longitude of the location in decimal degrees. Omitted when unknown. Example: -122.3320708')
});

const TripLocationSegmentSchema = z.object({
    start_date: z.string().describe('ISO-8601 datetime when the traveler arrived at this stop. Example: "2026-01-04T10:05:12+00:00"'),
    end_date: z.string().describe('ISO-8601 datetime when the traveler left this stop. Example: "2026-01-07T10:05:12+00:00"'),
    location: TravelLocationSchema.describe('Geographic location of this trip segment.')
});

const TripSpendEventSchema = z.object({
    id: z.string().describe('Unique identifier of the linked spend event. Example: "029e8768-19ad-4828-9a0f-324a729b80b6"'),
    spend_type: SpendTypeSchema.describe('Type of the linked spend event: a bill, reimbursement, or transaction.')
});

const TripAmountSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    value: z
        .number()
        .describe('Amount in the smallest denomination of the currency (e.g. cents for USD). May be negative for refund-dominated trips. Example: 97300')
});

const TripSchema = z.object({
    id: z.string().describe('Unique identifier of the trip. Example: "635c9868-fe5f-4124-bf3a-bf2a7df83396"'),
    name: z.string().describe('Name of the trip. Example: "Sales onsite in Chicago"'),
    description: z.string().optional().describe('Free-text description of the trip. Omitted when none was provided.'),
    status: TripStatusSchema.describe('Current lifecycle status of the trip.'),
    user_id: z.string().describe('Unique identifier of the traveler (Ramp user) the trip belongs to.'),
    start_date: z.string().describe('ISO-8601 datetime when the trip starts. Example: "2026-01-04T10:05:12+00:00"'),
    end_date: z.string().describe('ISO-8601 datetime when the trip ends. Example: "2026-01-07T10:05:12+00:00"'),
    created_at: z.string().describe('ISO-8601 datetime when the trip was created.'),
    updated_at: z.string().describe('ISO-8601 datetime when the trip was last updated.'),
    length_in_days: z.number().describe('Number of days the trip spans. Example: 4'),
    locations: z.array(TripLocationSegmentSchema).describe('Ordered destinations and location segments for the trip.'),
    spend_events: z.array(TripSpendEventSchema).describe('Bills, reimbursements, and transactions linked to the trip.'),
    travel_types: z.array(TravelTypeSchema).describe('Types of travel booked for the trip (car, flight, hotel). Empty when none are recorded.'),
    total_spend_amount: TripAmountSchema.optional().describe(
        'Total spend for the trip in minor units. Omitted when the trip has no spend events or its events do not share a single recognized currency.'
    )
});

function mapLocation(location: z.infer<typeof ProviderTravelLocationSchema>): z.infer<typeof TravelLocationSchema> {
    return {
        ...(location.city != null && { city: location.city }),
        ...(location.country != null && { country: location.country }),
        ...(location.state != null && { state: location.state }),
        ...(location.latitude != null && { latitude: location.latitude }),
        ...(location.longitude != null && { longitude: location.longitude })
    };
}

const InputSchema = z
    .object({
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe(
                'Pagination cursor (the trip ID to start after). Pass the `next_cursor` from the previous response to fetch the next page. Omit for the first page.'
            ),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of trips to return per page, between 2 and 100. Defaults to 20 when omitted.'),
        status: TripStatusSchema.optional().describe('Return only trips with this status.'),
        from_date: z
            .string()
            .optional()
            .describe('Full ISO-8601 datetime (e.g. "2026-01-01T00:00:00Z"). Returns trips that end on or after it, so a trip that started earlier but overlaps the window is included. A bare date is rejected.'),
        to_date: z
            .string()
            .optional()
            .describe('Full ISO-8601 datetime (e.g. "2026-12-31T23:59:59Z"). Returns trips that start on or before it; with from_date, every trip overlapping the window. A bare date is rejected.'),
        trip_name: z.string().optional().describe('Return only trips with this exact name. Example: "Trip to Denver"'),
        user_ids: z.array(z.string()).optional().describe('Return only trips belonging to any of these traveler (Ramp user) IDs.'),
        min_amount: z.number().optional().describe('Return only trips whose total spend is greater than or equal to this value.'),
        max_amount: z.number().optional().describe('Return only trips whose total spend is less than or equal to this value.')
    })
    .describe('Filters for listing business trips.');

const OutputSchema = z
    .object({
        trips: z.array(TripSchema).describe('Trips matching the filters, ordered by the provider default.'),
        next_cursor: z.string().optional().describe('Cursor to pass as `cursor` to fetch the next page. Omitted when there are no more pages.')
    })
    .describe('A page of business trips and the cursor for the next page.');

const RawTripsResponseSchema = z.object({
    data: z.array(ProviderTripSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

/**
 * @tags: [read]
 * @tagReason: Lists business trips with a read-only GET request; it does not create, modify, or delete any provider data.
 * @pitfalls: from_date/to_date require full ISO-8601 datetimes and match trips by date-range overlap (from_date keeps trips ending on or after it), so a trip that started before from_date can still be returned; total_spend_amount is omitted (not zero) when a trip has no spend events or its events do not share a single recognized currency.
 */
const action = createAction({
    description: 'List business trips, including their location segments, linked spend events, and total spend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['trips:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/trips)
            endpoint: '/developer/v1/trips',
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.from_date !== undefined && { from_date: input.from_date }),
                ...(input.to_date !== undefined && { to_date: input.to_date }),
                ...(input.trip_name !== undefined && { trip_name: input.trip_name }),
                ...(input.user_ids !== undefined && { user_ids: input.user_ids.join(',') }),
                ...(input.min_amount !== undefined && { min_amount: input.min_amount }),
                ...(input.max_amount !== undefined && { max_amount: input.max_amount })
            },
            retries: 3
        });

        const parsed = RawTripsResponseSchema.parse(response.data);

        const nextCursor = parsed.page.next !== null ? new URL(parsed.page.next).searchParams.get('start') : null;

        return {
            trips: parsed.data.map((trip) => ({
                id: trip.id,
                name: trip.name,
                ...(trip.description != null && { description: trip.description }),
                status: trip.status,
                user_id: trip.user_id,
                start_date: trip.start_date,
                end_date: trip.end_date,
                created_at: trip.created_at,
                updated_at: trip.updated_at,
                length_in_days: trip.length_in_days,
                locations: trip.locations.map((segment) => ({
                    start_date: segment.start_date,
                    end_date: segment.end_date,
                    location: mapLocation(segment.location)
                })),
                spend_events: trip.spend_events,
                travel_types: trip.travel_types,
                ...(trip.total_spend_amount != null && { total_spend_amount: trip.total_spend_amount })
            })),
            ...(nextCursor !== null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
