import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/simulate-kyc-outcome.js';

describe('agentcard simulate-kyc-outcome tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'simulate-kyc-outcome',
        Model: 'ActionOutput_agentcard_simulatekycoutcome'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
