import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-withdrawal-recipients.js';

describe('agentcard list-withdrawal-recipients tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-withdrawal-recipients',
        Model: 'ActionOutput_agentcard_listwithdrawalrecipients'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
