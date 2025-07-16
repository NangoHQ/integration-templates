import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/candidate-activities-list.js';

describe('recruiterflow candidate-activities-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'candidate-activities-list',
        Model: 'RecruiterFlowCandidateActivityListOutput'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
