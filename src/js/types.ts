type AssetDictData = {
  quantum?: string;
  tokenAddress?: string;
  tokenId?: string;
  blob?: string;
};

export type AssetDict = {
  type: string;
  data: AssetDictData;
};
