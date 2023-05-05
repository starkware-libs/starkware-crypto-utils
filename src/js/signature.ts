/////////////////////////////////////////////////////////////////////////////////
// Copyright 2019 StarkWare Industries Ltd.                                    //
//                                                                             //
// Licensed under the Apache License, Version 2.0 (the "License").             //
// You may not use this file except in compliance with the License.            //
// You may obtain a copy of the License at                                     //
//                                                                             //
// https://www.starkware.co/open-source-license/                               //
//                                                                             //
// Unless required by applicable law or agreed to in writing,                  //
// software distributed under the License is distributed on an "AS IS" BASIS,  //
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.    //
// See the License for the specific language governing permissions             //
// and limitations under the License.                                          //
/////////////////////////////////////////////////////////////////////////////////

import assert from 'assert';
import BN from 'bn.js';
import {curves as eCurves, ec as EllipticCurve} from 'elliptic';
import hash from 'hash.js';
import constantPointsHex from '../config/constant_points.json';
import {Range, assertInMultiRange, assertInRange} from './message_utils';

// Equals 2**251 + 17 * 2**192 + 1.
const prime = new BN(
  '800000000000011000000000000000000000000000000000000000000000001',
  16
);
// Equals 2**251. This value limits msgHash and the signature parts.
const maxEcdsaVal = new BN(
  '800000000000000000000000000000000000000000000000000000000000000',
  16
);

// Generate BN of used constants.
const zeroBn = new BN('0', 16);
const oneBn = new BN('1', 16);
const twoBn = new BN('2', 16);
const threeBn = new BN('3', 16);
const fourBn = new BN('4', 16);
const fiveBn = new BN('5', 16);
const twoPow22Bn = new BN('400000', 16);
const twoPow31Bn = new BN('80000000', 16);
const twoPow63Bn = new BN('8000000000000000', 16);
const vaultIDAllowedRanges = [
  new Range(zeroBn, twoPow31Bn),
  new Range(twoPow63Bn, twoPow63Bn.add(twoPow31Bn))
];

// Create an EC curve with stark curve parameters.
const starkEc = new EllipticCurve(
  new eCurves.PresetCurve({
    type: 'short',
    prime: null,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    p: prime,
    a: '00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000001',
    b: '06f21413 efbe40de 150e596d 72f7a8c5 609ad26c 15c915c1 f4cdfcb9 9cee9e89',
    n: '08000000 00000010 ffffffff ffffffff b781126d cae7b232 1e66a241 adc64d2f',
    hash: hash.sha256,
    gRed: false,
    g: constantPointsHex[1]
  })
);

const constantPoints = constantPointsHex.map(coords =>
  starkEc.curve.point(new BN(coords[0], 16), new BN(coords[1], 16))
);
const shiftPoint = constantPoints[0];

/**
 Checks that the string str start with '0x'.
 */
function hasHexPrefix(str: string) {
  return str.substring(0, 2) === '0x';
}

/**
 Full specification of the hash function can be found here:
 https://starkware.co/starkex/docs/signatures.html#pedersen-hash-function
 shiftPoint was added for technical reasons to make sure the zero point on the elliptic curve does
 not appear during the computation. constantPoints are multiples by powers of 2 of the constant
 points defined in the documentation.
 */
function pedersen(input: Array<string>) {
  let point = shiftPoint;
  for (let i = 0; i < input.length; i++) {
    let x = new BN(input[i], 16);
    assert(x.gte(zeroBn) && x.lt(prime), 'Invalid input: ' + input[i]);
    for (let j = 0; j < 252; j++) {
      const pt = constantPoints[2 + i * 252 + j];
      assert(!point.getX().eq(pt.getX()));
      if (x.and(oneBn).toNumber() !== 0) {
        point = point.add(pt);
      }
      x = x.shrn(1);
    }
  }
  return point.getX().toString(16);
}

function hashMsg(
  instructionTypeBn: BN,
  vault0Bn: BN,
  vault1Bn: BN,
  amount0Bn: BN,
  amount1Bn: BN,
  nonceBn: BN,
  expirationTimestampBn: BN,
  token0: string,
  token1OrPubKey: string,
  condition: string | null = null
) {
  let packedMessage = instructionTypeBn;
  packedMessage = packedMessage.ushln(31).add(vault0Bn);
  packedMessage = packedMessage.ushln(31).add(vault1Bn);
  packedMessage = packedMessage.ushln(63).add(amount0Bn);
  packedMessage = packedMessage.ushln(63).add(amount1Bn);
  packedMessage = packedMessage.ushln(31).add(nonceBn);
  packedMessage = packedMessage.ushln(22).add(expirationTimestampBn);
  let msgHash = null;
  if (condition === null) {
    msgHash = pedersen([
      pedersen([token0, token1OrPubKey]),
      packedMessage.toString(16)
    ]);
  } else {
    msgHash = pedersen([
      pedersen([pedersen([token0, token1OrPubKey]), condition]),
      packedMessage.toString(16)
    ]);
  }

  const msgHashBN = new BN(msgHash, 16);
  assertInRange(msgHashBN, zeroBn, maxEcdsaVal, 'msgHash');
  return msgHash;
}

function hashTransferMsgWithFee(
  instructionTypeBn: BN,
  senderVaultIdBn: BN,
  receiverVaultIdBn: BN,
  amountBn: BN,
  nonceBn: BN,
  expirationTimestampBn: BN,
  transferToken: string,
  receiverPublicKey: string,
  feeToken: string,
  feeVaultIdBn: BN,
  feeLimitBn: BN,
  condition: string | null = null
) {
  let packedMessage1 = senderVaultIdBn;
  packedMessage1 = packedMessage1.ushln(64).add(receiverVaultIdBn);
  packedMessage1 = packedMessage1.ushln(64).add(feeVaultIdBn);
  packedMessage1 = packedMessage1.ushln(32).add(nonceBn);
  let packedMessage2 = instructionTypeBn;
  packedMessage2 = packedMessage2.ushln(64).add(amountBn);
  packedMessage2 = packedMessage2.ushln(64).add(feeLimitBn);
  packedMessage2 = packedMessage2.ushln(32).add(expirationTimestampBn);
  packedMessage2 = packedMessage2.ushln(81).add(zeroBn);

  let msgHash = null;
  const tmpHash = pedersen([
    pedersen([transferToken, feeToken]),
    receiverPublicKey
  ]);
  if (condition === null) {
    msgHash = pedersen([
      pedersen([tmpHash, packedMessage1.toString(16)]),
      packedMessage2.toString(16)
    ]);
  } else {
    msgHash = pedersen([
      pedersen([pedersen([tmpHash, condition]), packedMessage1.toString(16)]),
      packedMessage2.toString(16)
    ]);
  }

  const msgHashBN = new BN(msgHash, 16);
  assertInRange(msgHashBN, zeroBn, maxEcdsaVal, 'msgHash');
  return msgHash;
}

function hashLimitOrderMsgWithFee(
  instructionTypeBn: BN,
  vaultSellBn: BN,
  vaultBuyBn: BN,
  amountSellBn: BN,
  amountBuyBn: BN,
  nonceBn: BN,
  expirationTimestampBn: BN,
  tokenSell: string,
  tokenBuy: string,
  feeToken: string,
  feeVaultIdBn: BN,
  feeLimitBn: BN
) {
  let packedMessage1 = amountSellBn;
  packedMessage1 = packedMessage1.ushln(64).add(amountBuyBn);
  packedMessage1 = packedMessage1.ushln(64).add(feeLimitBn);
  packedMessage1 = packedMessage1.ushln(32).add(nonceBn);
  let packedMessage2 = instructionTypeBn;
  packedMessage2 = packedMessage2.ushln(64).add(feeVaultIdBn);
  packedMessage2 = packedMessage2.ushln(64).add(vaultSellBn);
  packedMessage2 = packedMessage2.ushln(64).add(vaultBuyBn);
  packedMessage2 = packedMessage2.ushln(32).add(expirationTimestampBn);
  packedMessage2 = packedMessage2.ushln(17).add(zeroBn);

  let msgHash = null;
  const tmpHash = pedersen([pedersen([tokenSell, tokenBuy]), feeToken]);

  msgHash = pedersen([
    pedersen([tmpHash, packedMessage1.toString(16)]),
    packedMessage2.toString(16)
  ]);

  const msgHashBN = new BN(msgHash, 16);
  assertInRange(msgHashBN, zeroBn, maxEcdsaVal, 'msgHash');
  return msgHash;
}

/**
 Serializes the order message in the canonical format expected by the verifier.
 party_a sells amountSell coins of tokenSell from vaultSell.
 party_a buys amountBuy coins of tokenBuy into vaultBuy.

 Expected types:
 ---------------
 vaultSell, vaultBuy - uint31 (as int)
 amountSell, amountBuy - uint63 (as decimal string)
 tokenSell, tokenBuy - uint256 field element strictly less than the prime (as hex string with 0x)
 nonce - uint31 (as int)
 expirationTimestamp - uint22 (as int).
 */
function getLimitOrderMsgHash(
  vaultSell: number,
  vaultBuy: number,
  amountSell: string,
  amountBuy: string,
  tokenSell: string,
  tokenBuy: string,
  nonce: number,
  expirationTimestamp: number
) {
  assert(
    hasHexPrefix(tokenSell) && hasHexPrefix(tokenBuy),
    'Hex strings expected to be prefixed with 0x.'
  );
  const vaultSellBn = new BN(vaultSell);
  const vaultBuyBn = new BN(vaultBuy);
  const amountSellBn = new BN(amountSell, 10);
  const amountBuyBn = new BN(amountBuy, 10);
  const tokenSellBn = new BN(tokenSell.substring(2), 16);
  const tokenBuyBn = new BN(tokenBuy.substring(2), 16);
  const nonceBn = new BN(nonce);
  const expirationTimestampBn = new BN(expirationTimestamp);

  assertInRange(vaultSellBn, zeroBn, twoPow31Bn);
  assertInRange(vaultBuyBn, zeroBn, twoPow31Bn);
  assertInRange(amountSellBn, zeroBn, twoPow63Bn);
  assertInRange(amountBuyBn, zeroBn, twoPow63Bn);
  assertInRange(tokenSellBn, zeroBn, prime);
  assertInRange(tokenBuyBn, zeroBn, prime);
  assertInRange(nonceBn, zeroBn, twoPow31Bn);
  assertInRange(expirationTimestampBn, zeroBn, twoPow22Bn);

  const instructionType = zeroBn;
  return hashMsg(
    instructionType,
    vaultSellBn,
    vaultBuyBn,
    amountSellBn,
    amountBuyBn,
    nonceBn,
    expirationTimestampBn,
    tokenSell.substring(2),
    tokenBuy.substring(2)
  );
}

/**
 Same as getLimitOrderMsgHash, but also requires the fee info.

 Expected types of fee info params:
 ---------------
 feeVaultId - uint64 (as int)
 feeLimit - uint63 (as decimal string)
 feeToken - uint256 field element strictly less than the prime (as hex string with 0x)
 */
function getLimitOrderMsgHashWithFee(
  vaultSell: number,
  vaultBuy: number,
  amountSell: string,
  amountBuy: string,
  tokenSell: string,
  tokenBuy: string,
  nonce: number,
  expirationTimestamp: number,
  feeToken: string,
  feeVaultId: number,
  feeLimit: string
) {
  assert(
    hasHexPrefix(tokenSell) && hasHexPrefix(tokenBuy),
    'Hex strings expected to be prefixed with 0x.'
  );
  const vaultSellBn = new BN(vaultSell);
  const vaultBuyBn = new BN(vaultBuy);
  const amountSellBn = new BN(amountSell, 10);
  const amountBuyBn = new BN(amountBuy, 10);
  const tokenSellBn = new BN(tokenSell.substring(2), 16);
  const tokenBuyBn = new BN(tokenBuy.substring(2), 16);
  const nonceBn = new BN(nonce);
  const expirationTimestampBn = new BN(expirationTimestamp);
  const feeTokenBn = new BN(feeToken);
  const feeVaultIdBn = new BN(feeVaultId);
  const feeLimitBn = new BN(feeLimit);

  assertInMultiRange(vaultSellBn, vaultIDAllowedRanges);
  assertInMultiRange(vaultBuyBn, vaultIDAllowedRanges);
  assertInRange(amountSellBn, zeroBn, twoPow63Bn);
  assertInRange(amountBuyBn, zeroBn, twoPow63Bn);
  assertInRange(tokenSellBn, zeroBn, prime);
  assertInRange(tokenBuyBn, zeroBn, prime);
  assertInRange(nonceBn, zeroBn, twoPow31Bn);
  assertInRange(expirationTimestampBn, zeroBn, twoPow22Bn);
  assertInRange(feeTokenBn, zeroBn, prime);
  assertInMultiRange(feeVaultIdBn, vaultIDAllowedRanges);
  assertInRange(feeLimitBn, zeroBn, twoPow63Bn);

  const instructionType = threeBn;
  return hashLimitOrderMsgWithFee(
    instructionType,
    vaultSellBn,
    vaultBuyBn,
    amountSellBn,
    amountBuyBn,
    nonceBn,
    expirationTimestampBn,
    tokenSell.substring(2),
    tokenBuy.substring(2),
    feeToken.substring(2),
    feeVaultIdBn,
    feeLimitBn
  );
}

/**
 Serializes the transfer message in the canonical format expected by the verifier.
 The sender transfer 'amount' coins of 'token' from vault with id senderVaultId to vault with id
 receiverVaultId. The receiver's public key is receiverPublicKey.
 If a condition is added, it is verified before executing the transfer. The format of the condition
 is defined by the application.
 Expected types:
 ---------------
 amount - uint63 (as decimal string)
 nonce - uint31 (as int)
 senderVaultId uint31 (as int)
 token - uint256 field element strictly less than the prime (as hex string with 0x)
 receiverVaultId - uint31 (as int)
 receiverPublicKey - uint256 field element strictly less than the prime (as hex string with 0x)
 expirationTimestamp - uint22 (as int).
 condition - uint256 field element strictly less than the prime (as hex string with 0x)
 */
function getTransferMsgHash(
  amount: string,
  nonce: number,
  senderVaultId: number,
  token: string,
  receiverVaultId: number,
  receiverPublicKey: string,
  expirationTimestamp: number,
  condition: string | null = null
) {
  assert(
    hasHexPrefix(token) &&
      hasHexPrefix(receiverPublicKey) &&
      (condition === null || hasHexPrefix(condition)),
    'Hex strings expected to be prefixed with 0x.'
  );
  const amountBn = new BN(amount, 10);
  const nonceBn = new BN(nonce);
  const senderVaultIdBn = new BN(senderVaultId);
  const tokenBn = new BN(token.substring(2), 16);
  const receiverVaultIdBn = new BN(receiverVaultId);
  const receiverPublicKeyBn = new BN(receiverPublicKey.substring(2), 16);
  const expirationTimestampBn = new BN(expirationTimestamp);

  assertInRange(amountBn, zeroBn, twoPow63Bn);
  assertInRange(nonceBn, zeroBn, twoPow31Bn);
  assertInRange(senderVaultIdBn, zeroBn, twoPow31Bn);
  assertInRange(tokenBn, zeroBn, prime);
  assertInRange(receiverVaultIdBn, zeroBn, twoPow31Bn);
  assertInRange(receiverPublicKeyBn, zeroBn, prime);
  assertInRange(expirationTimestampBn, zeroBn, twoPow22Bn);
  let instructionType = oneBn;
  if (condition !== null) {
    condition = condition.substring(2);
    assertInRange(new BN(condition), zeroBn, prime, 'condition');
    instructionType = twoBn;
  }
  return hashMsg(
    instructionType,
    senderVaultIdBn,
    receiverVaultIdBn,
    amountBn,
    zeroBn,
    nonceBn,
    expirationTimestampBn,
    token.substring(2),
    receiverPublicKey.substring(2),
    condition
  );
}

/**
 Same as getTransferMsgHash, but also requires the fee info.

 Expected types of fee info params:
 ---------------
 feeVaultId - uint64 (as int)
 feeLimit - uint63 (as decimal string)
 feeToken - uint256 field element strictly less than the prime (as hex string with 0x)
 */
function getTransferMsgHashWithFee(
  amount: string,
  nonce: number,
  senderVaultId: number,
  token: string,
  receiverVaultId: number,
  receiverStarkKey: string,
  expirationTimestamp: number,
  feeToken: string,
  feeVaultId: number,
  feeLimit: string,
  condition: string | null = null
) {
  assert(
    hasHexPrefix(feeToken) &&
      hasHexPrefix(token) &&
      hasHexPrefix(receiverStarkKey) &&
      (condition === null || hasHexPrefix(condition)),
    'Hex strings expected to be prefixed with 0x.'
  );
  const amountBn = new BN(amount, 10);
  const nonceBn = new BN(nonce);
  const senderVaultIdBn = new BN(senderVaultId);
  const tokenBn = new BN(token.substring(2), 16);
  const receiverVaultIdBn = new BN(receiverVaultId);
  const receiverStarkKeyBn = new BN(receiverStarkKey.substring(2), 16);
  const expirationTimestampBn = new BN(expirationTimestamp);
  const feeTokenBn = new BN(feeToken);
  const feeVaultIdBn = new BN(feeVaultId);
  const feeLimitBn = new BN(feeLimit);

  assertInRange(amountBn, zeroBn, twoPow63Bn);
  assertInRange(nonceBn, zeroBn, twoPow31Bn);
  assertInMultiRange(senderVaultIdBn, vaultIDAllowedRanges);
  assertInRange(tokenBn, zeroBn, prime);
  assertInMultiRange(receiverVaultIdBn, vaultIDAllowedRanges);
  assertInRange(receiverStarkKeyBn, zeroBn, prime);
  assertInRange(expirationTimestampBn, zeroBn, twoPow22Bn);
  assertInRange(feeTokenBn, zeroBn, prime);
  assertInMultiRange(feeVaultIdBn, vaultIDAllowedRanges);
  assertInRange(feeLimitBn, zeroBn, twoPow63Bn);

  let instructionType = fourBn;
  if (condition !== null) {
    condition = condition.substring(2);
    assertInRange(new BN(condition), zeroBn, prime, 'condition');
    instructionType = fiveBn;
  }
  return hashTransferMsgWithFee(
    instructionType,
    senderVaultIdBn,
    receiverVaultIdBn,
    amountBn,
    nonceBn,
    expirationTimestampBn,
    token.substring(2),
    receiverStarkKey.substring(2),
    feeToken.substring(2),
    feeVaultIdBn,
    feeLimitBn,
    condition
  );
}

/**
 The function _truncateToN in lib/elliptic/ec/index.js does a shift-right of delta bits,
 if delta is positive, where
 delta = msgHash.byteLength() * 8 - starkEx.n.bitLength().
 This function does the opposite operation so that
 _truncateToN(fixMsgHashLen(msgHash)) == msgHash.
 */
function fixMsgHashLen(msgHash: string) {
  // Convert to BN to remove leading zeros.
  msgHash = new BN(msgHash, 16).toString(16);

  if (msgHash.length <= 62) {
    // In this case, msgHash should not be transformed, as the byteLength() is at most 31,
    // so delta < 0 (see _truncateToN).
    return msgHash;
  }
  assert(msgHash.length === 63);
  // In this case delta will be 4 so we perform a shift-left of 4 bits by adding a zero.
  return msgHash + '0';
}

/**
 Signs a message using the provided key.
 privateKey should be an elliptic.KeyPair with a valid private key.
 Returns an elliptic.Signature.
 */
function sign(privateKey: EllipticCurve.KeyPair, msgHash: string) {
  const msgHashBN = new BN(msgHash, 16);
  // Verify message hash has valid length.
  assertInRange(msgHashBN, zeroBn, maxEcdsaVal, 'msgHash');
  const msgSignature = privateKey.sign(fixMsgHashLen(msgHash));
  const {r, s} = msgSignature;
  const w = s.invm(starkEc.n as BN);
  // Verify signature has valid length.
  assertInRange(r, oneBn, maxEcdsaVal, 'r');
  assertInRange(s, oneBn, starkEc.n as BN, 's');
  assertInRange(w, oneBn, maxEcdsaVal, 'w');
  return msgSignature;
}

/**
 Verifies a message using the provided key.
 publicKey should be an elliptic.keyPair with a valid public key.
 msgSignature should be an elliptic.Signature.
 Returns a boolean true if the verification succeeds.
 */
function verify(
  publicKey: EllipticCurve.KeyPair,
  msgHash: string,
  msgSignature: EllipticCurve.Signature
) {
  const msgHashBN = new BN(msgHash, 16);
  // Verify message hash has valid length.
  assertInRange(msgHashBN, zeroBn, maxEcdsaVal, 'msgHash');
  const {r, s} = msgSignature;
  const w = s.invm(starkEc.n as BN);
  // Verify signature has valid length.
  assertInRange(r, oneBn, maxEcdsaVal, 'r');
  assertInRange(s, oneBn, starkEc.n as BN, 's');
  assertInRange(w, oneBn, maxEcdsaVal, 'w');
  return publicKey.verify(fixMsgHashLen(msgHash), msgSignature);
}

export {
  prime,
  starkEc as ec,
  constantPoints,
  shiftPoint,
  maxEcdsaVal,
  Range,
  pedersen,
  getLimitOrderMsgHash,
  getTransferMsgHash,
  sign,
  verify,
  assertInRange,
  assertInMultiRange,
  getTransferMsgHashWithFee,
  getLimitOrderMsgHashWithFee // Function.
};
