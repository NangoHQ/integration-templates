import { vi, expect, it, describe } from "vitest";
import type { NangoSync } from "../models.js";

import fetchData from "../syncs/deals.js";

describe("salesforce deals tests", () => {
  const nangoMock = new global.vitest.NangoSyncMock({ 
      dirname: __dirname,
      name: "deals",
      Model: "SalesforceDeal"
  });
  it("should get, map correctly the data and batchSave the result", async () => {
    await fetchData(nangoMock);

    const batchSaveData = await nangoMock.getBatchSaveData();
    expect(nangoMock.batchSave).toHaveBeenCalledWith(batchSaveData, "SalesforceDeal");
  });

  it('should get, map correctly the data and batchDelete the result', async () => {
      await fetchData(nangoMock);

      const batchDeleteData = await nangoMock.getBatchDeleteData();
      if (batchDeleteData && batchDeleteData.length > 0) {
          expect(nangoMock.batchDelete).toHaveBeenCalledWith(batchDeleteData, "SalesforceDeal");
      }
  });
});
