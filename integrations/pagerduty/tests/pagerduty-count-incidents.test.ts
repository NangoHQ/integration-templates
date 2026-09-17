import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/count-incidents.js';

describe('pagerduty count-incidents tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'count-incidents',
        Model: 'ActionOutput_pagerduty_countincidents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
