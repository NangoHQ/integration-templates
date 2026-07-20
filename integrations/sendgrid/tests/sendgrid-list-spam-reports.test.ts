import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-spam-reports.js';

describe('sendgrid list-spam-reports tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-spam-reports',
        Model: 'ActionOutput_sendgrid_listspamreports'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
