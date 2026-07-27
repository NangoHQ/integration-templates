import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-job-activities.js';

describe('workable list-job-activities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-activities',
        Model: 'ActionOutput_workable_listjobactivities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
