import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-candidate-tags.js';

describe('workable update-candidate-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-candidate-tags',
        Model: 'ActionOutput_workable_updatecandidatetags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
