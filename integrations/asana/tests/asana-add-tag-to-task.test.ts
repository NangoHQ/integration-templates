import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-tag-to-task.js';

describe('asana add-tag-to-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-tag-to-task',
        Model: 'ActionOutput_asana_addtagtotask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
