import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-withdrawal-recipient.js';

describe('agentcard delete-withdrawal-recipient tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-withdrawal-recipient',
        Model: 'ActionOutput_agentcard_deletewithdrawalrecipient'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
