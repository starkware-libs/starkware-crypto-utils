/* eslint-disable no-unused-expressions */
const {getAssetId, getAssetType} = require(`${SRC_DIR_PATH}/asset.js`);
const precomputedAssets = require(`${CONFIG_DIR_PATH}/assets_precomputed.json`);

describe('Asset Type computation', () => {
  it('should compute asset type correctly', () => {
    const precompytedAssetTypes = precomputedAssets.assetType;
    for (const expectedAssetType in precompytedAssetTypes) {
      if ({}.hasOwnProperty.call(precompytedAssetTypes, expectedAssetType)) {
        const asset = precompytedAssetTypes[expectedAssetType];
        expect(getAssetType(asset)).to.equal(expectedAssetType);
      }
    }
  });
});

describe('Asset ID computation', () => {
  it('should compute asset ID correctly', () => {
    const precompytedAssetIds = precomputedAssets.assetId;
    for (const expectedAssetId in precompytedAssetIds) {
      if ({}.hasOwnProperty.call(precompytedAssetIds, expectedAssetId)) {
        const asset = precompytedAssetIds[expectedAssetId];
        expect(getAssetId(asset)).to.equal(expectedAssetId);
      }
    }
  });
});
