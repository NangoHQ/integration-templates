import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-contacts.js';

describe('aircall list-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contacts',
        Model: 'ActionOutput_aircall_basic_listcontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
