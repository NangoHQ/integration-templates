import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        trip_id: z.string().describe('The unique identifier of the trip to retrieve. Example: "635c9868-fe5f-4124-bf3a-bf2a7df83396"')
    })
    .describe('Identifier of the trip to fetch.');

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
    total_spend: z.number(),
    total_spend_amount: z
        .object({
            currency: z.string(),
            value: z.number()
        })
        .nullable()
});

const TravelLocationSchema = z.object({
    city: z.string().optional().describe('City of the location. Omitted when unknown.'),
    country: z.string().optional().describe('Country of the location. Omitted when unknown.'),
    state: z.string().optional().describe('State or region of the location. Omitted when unknown.'),
    latitude: z.number().optional().describe('Latitude coordinate of the location. Omitted when unknown.'),
    longitude: z.number().optional().describe('Longitude coordinate of the location. Omitted when unknown.')
});

const TripLocationSegmentSchema = z.object({
    start_date: z.string().describe('ISO 8601 timestamp when the trip segment starts.'),
    end_date: z.string().describe('ISO 8601 timestamp when the trip segment ends.'),
    location: TravelLocationSchema.describe('The location visited during this trip segment.')
});

const TripSpendEventSchema = z.object({
    id: z.string().describe('Unique identifier of the associated spend event.'),
    spend_type: SpendTypeSchema.describe('Type of the associated spend event.')
});

const SignedAmountSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    value: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD); may be negative.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the trip.'),
        name: z.string().describe('Name of the trip.'),
        description: z.string().optional().describe('Description of the trip. Omitted when none was provided.'),
        status: TripStatusSchema.describe('Current status of the trip.'),
        user_id: z.string().describe('Unique identifier of the traveler (user) the trip belongs to.'),
        start_date: z.string().describe('ISO 8601 timestamp when the trip starts.'),
        end_date: z.string().describe('ISO 8601 timestamp when the trip ends.'),
        length_in_days: z.number().describe('Number of days the trip spans.'),
        locations: z.array(TripLocationSegmentSchema).describe('Destinations and location segments for the trip.'),
        spend_events: z.array(TripSpendEventSchema).describe('Spend events associated with the trip.'),
        travel_types: z.array(TravelTypeSchema).describe('Types of travel booked for the trip.'),
        total_spend: z.number().describe('Deprecated total spend for the trip; prefer total_spend_amount.'),
        total_spend_amount: SignedAmountSchema.optional().describe(
            'Total spend in minor units with an explicit currency. Omitted when the trip has no spend events or mixed currencies.'
        ),
        created_at: z.string().describe('ISO 8601 timestamp when the trip was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the trip was last updated.')
    })
    .describe('A single trip for the business.');

function mapLocation(location: z.infer<typeof ProviderTravelLocationSchema>): z.infer<typeof TravelLocationSchema> {
    return {
        ...(location.city != null && { city: location.city }),
        ...(location.country != null && { country: location.country }),
        ...(location.state != null && { state: location.state }),
        ...(location.latitude != null && { latitude: location.latitude }),
        ...(location.longitude != null && { longitude: location.longitude })
    };
}

/**
 * @tags: [read]
 * @tagReason: Fetches a single trip from the provider and does not modify any data.
 * @pitfalls: Returns 404 for a trip_id that does not exist; total_spend is deprecated in favor of total_spend_amount, which is omitted when the trip has no spend events or mixed currencies and may be negative for refund-dominated trips.
 */
const action = createAction({
    description: 'Retrieve a single trip by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['trips:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api/trips
            endpoint: `/developer/v1/trips/${encodeURIComponent(input.trip_id)}`,
            retries: 3
        });

        const trip = ProviderTripSchema.parse(response.data);

        return {
            id: trip.id,
            name: trip.name,
            ...(trip.description != null && { description: trip.description }),
            status: trip.status,
            user_id: trip.user_id,
            start_date: trip.start_date,
            end_date: trip.end_date,
            length_in_days: trip.length_in_days,
            locations: trip.locations.map((segment) => ({
                start_date: segment.start_date,
                end_date: segment.end_date,
                location: mapLocation(segment.location)
            })),
            spend_events: trip.spend_events,
            travel_types: trip.travel_types,
            total_spend: trip.total_spend,
            ...(trip.total_spend_amount != null && { total_spend_amount: trip.total_spend_amount }),
            created_at: trip.created_at,
            updated_at: trip.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
