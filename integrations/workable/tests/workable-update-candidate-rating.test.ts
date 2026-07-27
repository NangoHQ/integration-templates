import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-candidate-rating.js';

describe('workable update-candidate-rating tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-candidate-rating',
        Model: 'ActionOutput_workable_updatecandidaterating'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
