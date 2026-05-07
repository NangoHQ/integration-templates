import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-company-contacts.js';

describe('intercom list-company-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-company-contacts',
        Model: 'ActionOutput_intercom_listcompanycontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
