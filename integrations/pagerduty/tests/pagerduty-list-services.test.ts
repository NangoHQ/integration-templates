import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-services.js';

describe('pagerduty list-services tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-services',
        Model: 'ActionOutput_pagerduty_listservices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
