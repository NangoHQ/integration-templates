import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-scorecard-kpis.js';

describe('ninety-io list-scorecard-kpis tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-scorecard-kpis',
        Model: 'ActionOutput_ninety_io_listscorecardkpis'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
