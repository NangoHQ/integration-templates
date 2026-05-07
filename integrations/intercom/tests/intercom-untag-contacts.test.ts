import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/untag-contacts.js';

describe('intercom untag-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'untag-contacts',
        Model: 'ActionOutput_intercom_untagcontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
