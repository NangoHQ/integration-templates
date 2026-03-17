import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-marketing-email.js';

describe('hubspot delete-marketing-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-marketing-email',
        Model: 'ActionOutput_hubspot_deletemarketingemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
