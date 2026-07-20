import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-list.js';

describe('sendgrid create-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-list',
        Model: 'ActionOutput_sendgrid_createlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
