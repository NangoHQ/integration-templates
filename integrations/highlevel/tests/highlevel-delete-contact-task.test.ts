import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-contact-task.js';

describe('highlevel delete-contact-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-contact-task',
        Model: 'ActionOutput_highlevel_deletecontacttask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
