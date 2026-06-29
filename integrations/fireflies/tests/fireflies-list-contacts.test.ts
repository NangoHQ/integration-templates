import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-contacts.js';

describe('fireflies list-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-contacts',
        Model: 'ActionOutput_fireflies_listcontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
