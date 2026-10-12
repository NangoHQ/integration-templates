import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-insights.js';

describe('exist list-insights tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-insights',
        Model: 'ActionOutput_exist_listinsights'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
