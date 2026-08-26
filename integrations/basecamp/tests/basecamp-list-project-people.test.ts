import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-project-people.js';

describe('basecamp list-project-people tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-project-people',
        Model: 'ActionOutput_basecamp_listprojectpeople'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
