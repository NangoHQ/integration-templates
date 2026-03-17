import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-marketing-email.js';

describe('hubspot update-marketing-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-marketing-email',
        Model: 'ActionOutput_hubspot_updatemarketingemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
