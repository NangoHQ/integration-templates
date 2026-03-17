import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-marketing-email.js';

describe('hubspot create-marketing-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-marketing-email',
        Model: 'ActionOutput_hubspot_createmarketingemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
