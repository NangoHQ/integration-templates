import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-projects.js';

describe('linear list-projects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-projects',
        Model: 'ActionOutput_linear_listprojects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
