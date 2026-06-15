import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-task.js';

describe('zoho-mail update-task tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-task',
        Model: 'ActionOutput_zoho_mail_updatetask'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
