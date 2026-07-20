import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-spam-reports.js';

describe('sendgrid delete-spam-reports tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-spam-reports',
        Model: 'ActionOutput_sendgrid_deletespamreports'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
