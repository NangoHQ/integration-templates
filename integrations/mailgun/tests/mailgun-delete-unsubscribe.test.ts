import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-unsubscribe.js';

describe('mailgun delete-unsubscribe tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-unsubscribe',
        Model: 'ActionOutput_mailgun_deleteunsubscribe'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
