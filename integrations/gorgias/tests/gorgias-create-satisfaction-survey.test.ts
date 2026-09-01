import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-satisfaction-survey.js';

describe('gorgias create-satisfaction-survey tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-satisfaction-survey',
        Model: 'ActionOutput_gorgias_createsatisfactionsurvey'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
