import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-contact-methods.js';

describe('pagerduty list-user-contact-methods tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-contact-methods',
        Model: 'ActionOutput_pagerduty_listusercontactmethods'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
