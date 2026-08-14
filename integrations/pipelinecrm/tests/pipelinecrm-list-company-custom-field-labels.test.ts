import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-company-custom-field-labels.js';

describe('pipelinecrm list-company-custom-field-labels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-company-custom-field-labels',
        Model: 'ActionOutput_pipelinecrm_listcompanycustomfieldlabels'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
