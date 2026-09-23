import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-oncalls.js';

describe('pagerduty list-oncalls tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-oncalls',
        Model: 'ActionOutput_pagerduty_listoncalls'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
