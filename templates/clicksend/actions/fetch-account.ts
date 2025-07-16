import { createAction } from "nango";
import type { ClickSendAccount } from '../types.js';
import { toAccount } from '../mappers/to-account.js';

import { Account } from "../models.js";
import { z } from "zod";

const action = createAction({
    description: "Fetches basic information about the ClickSend account.",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/account",
        group: "Account"
    },

    input: z.void(),
    output: Account,

    exec: async (nango, _input): Promise<Account> => {
        const response = await nango.get<{ data: ClickSendAccount }>({
            // https://developers.clicksend.com/docs/accounts/management/other/view-account-details
            endpoint: '/v3/account',
            retries: 3
        });

        const clickSendAccount = response.data.data;

        return toAccount(clickSendAccount);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
