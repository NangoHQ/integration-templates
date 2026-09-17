import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-service.js';

describe('pagerduty delete-service tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-service',
        Model: 'ActionOutput_pagerduty_deleteservice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
