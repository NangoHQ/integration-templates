import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-candidate-activities.js';

describe('workable list-candidate-activities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-candidate-activities',
        Model: 'ActionOutput_workable_listcandidateactivities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
