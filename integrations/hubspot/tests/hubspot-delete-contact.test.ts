import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-contact.js';

describe('hubspot delete-contact tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-contact',
        Model: 'ActionOutput_hubspot_deletecontact'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
