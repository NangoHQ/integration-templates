import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/merge-contacts.js';

describe('intercom merge-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'merge-contacts',
        Model: 'ActionOutput_intercom_mergecontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
