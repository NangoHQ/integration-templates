import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-contacts-count.js';

describe('sendgrid get-contacts-count tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-contacts-count',
        Model: 'ActionOutput_sendgrid_getcontactscount'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
