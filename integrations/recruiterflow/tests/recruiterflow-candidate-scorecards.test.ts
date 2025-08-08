import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/candidate-scorecards.js';

describe('recruiterflow candidate-scorecards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'candidate-scorecards',
        Model: 'RecruiterFlowCandidateScorecard'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
