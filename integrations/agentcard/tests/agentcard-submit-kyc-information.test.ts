import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-kyc-information.js';

describe('agentcard submit-kyc-information tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-kyc-information',
        Model: 'ActionOutput_agentcard_submitkycinformation'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
