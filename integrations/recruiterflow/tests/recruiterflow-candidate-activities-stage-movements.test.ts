import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/candidate-activities-stage-movements.js';

describe('recruiterflow candidate-activities-stage-movements tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'candidate-activities-stage-movements',
        Model: 'RecruiterFlowCandidateActivityStageMovementOutput'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
