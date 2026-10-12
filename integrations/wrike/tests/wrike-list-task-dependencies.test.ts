import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-task-dependencies.js';

describe('wrike list-task-dependencies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-task-dependencies',
        Model: 'ActionOutput_wrike_listtaskdependencies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
