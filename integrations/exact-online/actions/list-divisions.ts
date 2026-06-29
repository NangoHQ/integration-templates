import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const DivisionSchema = z.object({
    Code: z.number(),
    Description: z.string().optional(),
    Currency: z.string().optional(),
    Country: z.string().optional(),
    Status: z.number().optional()
});

const OutputSchema = z.object({
    divisions: z.array(DivisionSchema)
});

const MeResponseSchema = z.object({
    d: z.object({
        CurrentDivision: z.number().optional(),
        results: z
            .array(
                z.object({
                    CurrentDivision: z.number()
                })
            )
            .optional()
    })
});

const DivisionsListSchema = z.object({
    d: z.object({
        results: z.array(z.unknown())
    })
});

const action = createAction({
    description: 'List all divisions/administrations accessible to the authenticated user.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-divisions',
        method: 'GET'
    },
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-gettingstarted
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meParsed = MeResponseSchema.safeParse(meResponse.data);
        if (!meParsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse current user response.'
            });
        }

        let currentDivision: number | undefined;
        const meData = meParsed.data.d;
        if (typeof meData.CurrentDivision === 'number') {
            currentDivision = meData.CurrentDivision;
        } else if (Array.isArray(meData.results) && meData.results.length > 0) {
            currentDivision = meData.results[0]?.CurrentDivision;
        }

        if (currentDivision === undefined) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'CurrentDivision not found in user response.'
            });
        }

        // https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-restapi-gettingstarted
        const divisionsResponse = await nango.get({
            endpoint: `/api/v1/${encodeURIComponent(currentDivision)}/system/Divisions`,
            retries: 3
        });

        const divisionsParsed = DivisionsListSchema.safeParse(divisionsResponse.data);
        if (!divisionsParsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse divisions response.'
            });
        }

        const divisions: z.infer<typeof DivisionSchema>[] = [];
        for (const item of divisionsParsed.data.d.results) {
            const division = DivisionSchema.safeParse(item);
            if (division.success) {
                divisions.push(division.data);
            }
        }

        return {
            divisions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
