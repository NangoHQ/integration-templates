import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-admins.js';

describe('intercom list-admins tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-admins',
        Model: 'ActionOutput_intercom_listadmins'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
