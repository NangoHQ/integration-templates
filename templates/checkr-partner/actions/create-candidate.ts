import { createAction } from "nango";
import { constructRequest } from '../helpers/construct-request.js';

import type { Location} from "../models.js";
import { Candidate, CreateCandidate } from "../models.js";

const action = createAction({
    description: "Create a candidate",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/candidates"
    },

    input: CreateCandidate,
    output: Candidate,

    exec: async (nango, rawInput): Promise<Candidate> => {
        validate(nango, rawInput);

        const work_location: Location = {
            country: rawInput.country
        };

        const { country, ...rest } = rawInput;

        const input = { ...rest };

        if (input?.state) {
            work_location.state = input.state;

            delete input.state;
        }

        if (input?.city) {
            work_location.city = input.city;

            delete input.city;
        }

        const config = await constructRequest(nango, '/v1/candidates');

        const response = await nango.post<Candidate>({
            ...config,
            data: {
                ...input,
                work_locations: [work_location]
            },
            retries: 3
        });

        return response.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

function validate(nango: NangoActionLocal, input: CreateCandidate): void {
    if (!input) {
        throw new nango.ActionError({
            message: `input is missing`
        });
    }

    if (!input.email) {
        throw new nango.ActionError({
            message: `email is missing`
        });
    }

    if (!input.first_name) {
        throw new nango.ActionError({
            message: `first_name is missing`
        });
    }

    if (!input.middle_name && typeof input?.no_middle_name === 'undefined') {
        throw new nango.ActionError({
            message: `middle_name is missing or no_middle_name (boolean) is missing`
        });
    }

    if (!input.phone) {
        throw new nango.ActionError({
            message: `phone is missing`
        });
    }

    if (!input.country) {
        throw new nango.ActionError({
            message: `country is missing`
        });
    }
}
