import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-candidate-files.js';

describe('workable list-candidate-files tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-candidate-files',
        Model: 'ActionOutput_workable_listcandidatefiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
