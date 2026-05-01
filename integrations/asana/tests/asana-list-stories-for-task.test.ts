import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-stories-for-task.js';

describe('asana list-stories-for-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-stories-for-task',
        Model: 'ActionOutput_asana_liststoriesfortask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
