import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-contacts-from-list.js';

describe('sendgrid remove-contacts-from-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-contacts-from-list',
        Model: 'ActionOutput_sendgrid_removecontactsfromlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
