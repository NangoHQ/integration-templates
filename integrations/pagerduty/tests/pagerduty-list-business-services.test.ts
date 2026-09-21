import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-business-services.js';

describe('pagerduty list-business-services tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-business-services',
        Model: 'ActionOutput_pagerduty_listbusinessservices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
