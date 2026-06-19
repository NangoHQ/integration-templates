import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-availability-classes.js';

describe('acuity-scheduling list-availability-classes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-availability-classes',
        Model: 'ActionOutput_acuity_scheduling_listavailabilityclasses'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
