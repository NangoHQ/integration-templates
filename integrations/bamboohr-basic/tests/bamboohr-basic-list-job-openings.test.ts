import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-job-openings.js';

describe('bamboohr list-job-openings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-job-openings',
        Model: 'ActionOutput_bamboohr_listjobopenings'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
