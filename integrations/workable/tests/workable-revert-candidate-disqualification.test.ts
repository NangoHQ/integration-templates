import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/revert-candidate-disqualification.js';

describe('workable revert-candidate-disqualification tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'revert-candidate-disqualification',
        Model: 'ActionOutput_workable_revertcandidatedisqualification'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
