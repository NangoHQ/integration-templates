import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-custom-field-dropdown-entries.js';

describe('pipelinecrm list-custom-field-dropdown-entries tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-custom-field-dropdown-entries',
        Model: 'ActionOutput_pipelinecrm_listcustomfielddropdownentries'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
