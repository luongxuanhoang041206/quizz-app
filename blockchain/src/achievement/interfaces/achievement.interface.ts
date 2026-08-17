export interface AchievementMetadata {
  name: string;
  description: string;
  image: string;      // ipfs://Qm... or https://...
  quizId?: string;
}

export interface PinataUploadResult {
  cid: string;           // IPFS CID
  contentHashHex: string; // SHA-256 hex of the JSON bytes
}

export interface ClaimResponse {
  txHash: string;
  unsignedTxCbor: string;
  ipfsCid: string;
  contentHash: string;
  policyId: string;
  userAssetName: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface Cip25AssetMetadata {
  /** Human-readable token name — required by CIP-25. */
  name: string;
  /** IPFS image URI — must be "ipfs://CID". Required by CIP-25. */
  image: string;
  
  description?: string;

  // Custom fields
  quizId?: string;

  [key: string]: string | number | boolean | undefined;
}
