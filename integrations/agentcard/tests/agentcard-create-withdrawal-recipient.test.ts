import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-withdrawal-recipient.js';

describe('agentcard create-withdrawal-recipient tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-withdrawal-recipient',
        Model: 'ActionOutput_agentcard_createwithdrawalrecipient'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
