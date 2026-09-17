import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-entity-tags.js';

describe('pagerduty get-entity-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-entity-tags',
        Model: 'ActionOutput_pagerduty_getentitytags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
