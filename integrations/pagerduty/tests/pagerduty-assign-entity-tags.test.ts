import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/assign-entity-tags.js';

describe('pagerduty assign-entity-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'assign-entity-tags',
        Model: 'ActionOutput_pagerduty_assignentitytags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
