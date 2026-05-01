import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-tag-from-task.js';

describe('asana remove-tag-from-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-tag-from-task',
        Model: 'ActionOutput_asana_removetagfromtask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
