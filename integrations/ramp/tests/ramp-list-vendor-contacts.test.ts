import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-vendor-contacts.js';

describe('ramp list-vendor-contacts tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-vendor-contacts',
        Model: 'ActionOutput_ramp_listvendorcontacts'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
