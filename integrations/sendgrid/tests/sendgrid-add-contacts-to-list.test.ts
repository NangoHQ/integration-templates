import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-contacts-to-list.js';

describe('sendgrid add-contacts-to-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-contacts-to-list',
        Model: 'ActionOutput_sendgrid_addcontactstolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
