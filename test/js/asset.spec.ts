import {expect} from 'chai';

import {getAssetId, getAssetType} from '../../src/js/asset';
import precomputedAssets from '../../src/config/assets_precomputed.json';
import {AssetDict} from '../../src/js/types';

type AssetDictSet = {[address: string]: AssetDict};

describe('Asset Type computation', () => {
  it('should compute asset type correctly', () => {
    const precomputedAssetsTypes = precomputedAssets.assetType as AssetDictSet;
    for (const expectedAssetType in precomputedAssetsTypes) {
      if ({}.hasOwnProperty.call(precomputedAssetsTypes, expectedAssetType)) {
        const asset = precomputedAssetsTypes[expectedAssetType];
        expect(getAssetType(asset)).to.equal(expectedAssetType);
      }
    }
  });
});

describe('Asset ID computation', () => {
  it('should compute asset ID correctly', () => {
    const precomputedAssetsIds = precomputedAssets.assetId as AssetDictSet;
    for (const expectedAssetId in precomputedAssetsIds) {
      if ({}.hasOwnProperty.call(precomputedAssetsIds, expectedAssetId)) {
        const asset = precomputedAssetsIds[expectedAssetId];
        expect(getAssetId(asset)).to.equal(expectedAssetId);
      }
    }
  });
});
