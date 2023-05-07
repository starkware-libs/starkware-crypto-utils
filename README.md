<!-- logo -->
<h1 align='center'>StarkWare Crypto Utils</h1>

<!-- tag line -->
<h4 align='center'> Signatures, keys and Pedersen hash on STARK friendly elliptic curve</h4>

<!-- primary badges -->
<p align="center">
  <a href="https://www.w3schools.com/js/">
    <img src='https://badges.aleen42.com/src/javascript.svg' />
  </a> 
  <a href="https://www.npmjs.com/package/@starkware-industries/starkware-crypto-utils">
    <img src='https://img.shields.io/npm/v/@starkware-industries/starkware-crypto-utils?label=npm' />
  </a>
  <a href="https://starkware.co/">
    <img src="https://img.shields.io/badge/powered_by-StarkWare-navy">
  </a>
</p>

## Installation

```bash
// using npm
npm i @starkware-industries/starkware-crypto-utils

// using yarn
yarn add @starkware-industries/starkware-crypto-utils
```

## How to use it

```js
const starkwareCrypto = require('@starkware-industries/starkware-crypto-utils');
```

## API

```javascript

{
    prime,
    ec: starkEc,
    constantPoints,
    shiftPoint,
    maxEcdsaVal, // Data.
    pedersen,
    getLimitOrderMsgHash,
    getTransferMsgHash,
    sign,
    verify,
    assertInRange,
    getTransferMsgHashWithFee,
    getLimitOrderMsgHashWithFee // Function.

    asset: {
      getAssetType,
      getAssetId // Function.
    },

    keyDerivation: {
      StarkExEc: ec.n, // Data.
      getPrivateKeyFromEthSignature,
      privateToStarkKey,
      getKeyPairFromPath,
      getAccountPath,
      grindKey // Function.
    },

    messageUtils: {
      assertInRange // Function.
    }
}
```

## Usage

### Signing a StarkEx order

```javascript
const starkwareCrypto = require('@starkware-libs/starkware-crypto-utils');
const testData = require('test/config/signature_test_data.json');

const privateKey = testData.meta_data.party_a_order.private_key.substring(2);
const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
const publicKey = starkwareCrypto.ec.keyFromPublic(
  keyPair.getPublic(true, 'hex'),
  'hex'
);
const publicKeyX = publicKey.pub.getX();

assert(
  publicKeyX.toString(16) ===
    testData.settlement.party_a_order.public_key.substring(2),
  `Got: ${publicKeyX.toString(16)}.
        Expected: ${testData.settlement.party_a_order.public_key.substring(2)}`
);

const {party_a_order: partyAOrder} = testData.settlement;
const msgHash = starkwareCrypto.getLimitOrderMsgHash(
  partyAOrder.vault_id_sell, // - vault_sell (uint31)
  partyAOrder.vault_id_buy, // - vault_buy (uint31)
  partyAOrder.amount_sell, // - amount_sell (uint63 decimal str)
  partyAOrder.amount_buy, // - amount_buy (uint63 decimal str)
  partyAOrder.token_sell, // - token_sell (hex str with 0x prefix < prime)
  partyAOrder.token_buy, // - token_buy (hex str with 0x prefix < prime)
  partyAOrder.nonce, // - nonce (uint31)
  partyAOrder.expiration_timestamp // - expiration_timestamp (uint22)
);

assert(
  msgHash === testData.meta_data.party_a_order.message_hash.substring(2),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.party_a_order.message_hash.substring(2)
);

const msgSignature = starkwareCrypto.sign(keyPair, msgHash);
const {r, s} = msgSignature;

assert(starkwareCrypto.verify(publicKey, msgHash, msgSignature));
assert(
  r.toString(16) === partyAOrder.signature.r.substring(2),
  `Got: ${r.toString(16)}. Expected: ${partyAOrder.signature.r.substring(2)}`
);
assert(
  s.toString(16) === partyAOrder.signature.s.substring(2),
  `Got: ${s.toString(16)}. Expected: ${partyAOrder.signature.s.substring(2)}`
);

// The following is the JSON representation of an order:
console.log('Order JSON representation: ');
console.log(partyAOrder);
console.log('\n');
```

### StarkEx key serialization

```javascript
const starkwareCrypto = require('@starkware-libs/starkware-crypto-utils');

const pubXStr = publicKey.pub.getX().toString('hex');
const pubYStr = publicKey.pub.getY().toString('hex');

// Verify Deserialization.
const pubKeyDeserialized = starkwareCrypto.ec.keyFromPublic(
  {x: pubXStr, y: pubYStr},
  'hex'
);
assert(starkwareCrypto.verify(pubKeyDeserialized, msgHash, msgSignature));
```

### Signing a StarkEx order with fee

```javascript
const privateKey = testData.meta_data.party_a_order.private_key.substring(2);
const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
const publicKey = starkwareCrypto.ec.keyFromPublic(
  keyPair.getPublic(true, 'hex'),
  'hex'
);
const publicKeyX = publicKey.pub.getX();

assert(
  publicKeyX.toString(16) ===
    testData.settlement.party_a_order.public_key.substring(2),
  `Got: ${publicKeyX.toString(16)}.
        Expected: ${testData.settlement.party_a_order.public_key.substring(2)}`
);

const {party_a_order: partyAOrder} = testData.settlement;
const feeInfo = testData.fee_info_user;
const msgHash = starkwareCrypto.getLimitOrderMsgHashWithFee(
  partyAOrder.vault_id_sell, // - vault_sell (uint64)
  partyAOrder.vault_id_buy, // - vault_buy (uint64)
  partyAOrder.amount_sell, // - amount_sell (uint63 decimal str)
  partyAOrder.amount_buy, // - amount_buy (uint63 decimal str)
  partyAOrder.token_sell, // - token_sell (hex str with 0x prefix < prime)
  partyAOrder.token_buy, // - token_buy (hex str with 0x prefix < prime)
  partyAOrder.nonce, // - nonce (uint31)
  partyAOrder.expiration_timestamp, // - expiration_timestamp (uint22)
  feeInfo.token_id, // - token (hex str with 0x prefix < prime)
  feeInfo.source_vault_id, // - fee_source_vault_id (uint31)
  feeInfo.fee_limit // - amount (uint63 decimal str)
);

assert(
  msgHash ===
    testData.meta_data.party_a_order_with_fee.message_hash.substring(2),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.party_a_order_with_fee.message_hash.substring(2)
);

// The following is the JSON representation of an order:
console.log('Order With Fee JSON representation: ');
// Fee info is added to the order, and will be also be seen in the JSON of Settlement.
partyAOrder.fee_info = feeInfo; // eslint-disable-line
console.log(partyAOrder);
console.log('\n');
```

### StarkEx transfer

```javascript
const starkwareCrypto = require('@starkware-libs/starkware-crypto-utils');
const testData = require('test/config/signature_test_data.json');

const privateKey = testData.meta_data.transfer_order.private_key.substring(2);
const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
const publicKey = starkwareCrypto.ec.keyFromPublic(
  keyPair.getPublic(true, 'hex'),
  'hex'
);
const publicKeyX = publicKey.pub.getX();

assert(
  publicKeyX.toString(16) === testData.transfer_order.public_key.substring(2),
  `Got: ${publicKeyX.toString(16)}.
            Expected: ${testData.transfer_order.public_key.substring(2)}`
);

const transfer = testData.transfer_order;
const msgHash = starkwareCrypto.getTransferMsgHash(
  transfer.amount, // - amount (uint63 decimal str)
  transfer.nonce, // - nonce (uint31)
  transfer.sender_vault_id, // - sender_vault_id (uint31)
  transfer.token, // - token (hex str with 0x prefix < prime)
  transfer.target_vault_id, // - target_vault_id (uint31)
  transfer.target_public_key, // - target_public_key (hex str with 0x prefix < prime)
  transfer.expiration_timestamp // - expiration_timestamp (uint22)
);

assert(
  msgHash === testData.meta_data.transfer_order.message_hash.substring(2),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.transfer_order.message_hash.substring(2)
);

// The following is the JSON representation of a transfer:
console.log('Transfer JSON representation: ');
console.log(transfer);
console.log('\n');
```

### StarkEx conditional transfer

```javascript
const starkwareCrypto = require('@starkware-libs/starkware-crypto-utils');
const testData = require('test/config/signature_test_data.json');

const privateKey =
  testData.meta_data.conditional_transfer_order.private_key.substring(2);
const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
const publicKey = starkwareCrypto.ec.keyFromPublic(
  keyPair.getPublic(true, 'hex'),
  'hex'
);
const publicKeyX = publicKey.pub.getX();

assert(
  publicKeyX.toString(16) ===
    testData.conditional_transfer_order.public_key.substring(2),
  `Got: ${publicKeyX.toString(16)}.
        Expected: ${testData.conditional_transfer_order.public_key.substring(
          2
        )}`
);

const transfer = testData.conditional_transfer_order;
const msgHash = starkwareCrypto.getTransferMsgHash(
  transfer.amount, // - amount (uint63 decimal str)
  transfer.nonce, // - nonce (uint31)
  transfer.sender_vault_id, // - sender_vault_id (uint31)
  transfer.token, // - token (hex str with 0x prefix < prime)
  transfer.target_vault_id, // - target_vault_id (uint31)
  transfer.target_public_key, // - target_public_key (hex str with 0x prefix < prime)
  transfer.expiration_timestamp, // - expiration_timestamp (uint22)
  transfer.condition // - condition (hex str with 0x prefix < prime)
);

assert(
  msgHash ===
    testData.meta_data.conditional_transfer_order.message_hash.substring(2),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.conditional_transfer_order.message_hash.substring(2)
);

// The following is the JSON representation of a transfer:
console.log('Conditional Transfer JSON representation: ');
console.log(transfer);
console.log('\n');
```

### StarkEx transfer with fee

```javascript
const privateKey = testData.meta_data.transfer_order.private_key.substring(2);
const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
const publicKey = starkwareCrypto.ec.keyFromPublic(
  keyPair.getPublic(true, 'hex'),
  'hex'
);
const publicKeyX = publicKey.pub.getX();

assert(
  publicKeyX.toString(16) === testData.transfer_order.public_key.substring(2),
  `Got: ${publicKeyX.toString(16)}.
        Expected: ${testData.transfer_order.public_key.substring(2)}`
);

const transfer = testData.transfer_order;
const feeInfo = testData.fee_info_user;
const msgHash = starkwareCrypto.getTransferMsgHashWithFee(
  transfer.amount, // - amount (uint63 decimal str)
  transfer.nonce, // - nonce (uint31)
  transfer.sender_vault_id, // - sender_vault_id (uint64)
  transfer.token, // - token (hex str with 0x prefix < prime)
  transfer.target_vault_id, // - target_vault_id (uint64)
  transfer.target_public_key, // - target_public_key (hex str with 0x prefix < prime)
  transfer.expiration_timestamp, // - expiration_timestamp (uint22)
  feeInfo.token_id, // - token (hex str with 0x prefix < prime)
  feeInfo.source_vault_id, // - fee_source_vault_id (uint64)
  feeInfo.fee_limit // - amount (uint63 decimal str)
);

assert(
  msgHash ===
    testData.meta_data.transfer_order_with_fee.message_hash.substring(2),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.transfer_order.message_hash.substring(2)
);

// The following is the JSON representation of a transfer:
console.log('Transfer With Fee JSON representation: ');
console.log(transfer);
console.log('\n');
```

### StarkEx conditional Transfer with fee

```javascript
const privateKey =
  testData.meta_data.conditional_transfer_order.private_key.substring(2);
const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
const publicKey = starkwareCrypto.ec.keyFromPublic(
  keyPair.getPublic(true, 'hex'),
  'hex'
);
const publicKeyX = publicKey.pub.getX();

assert(
  publicKeyX.toString(16) ===
    testData.conditional_transfer_order.public_key.substring(2),
  `Got: ${publicKeyX.toString(16)}.
        Expected: ${testData.conditional_transfer_order.public_key.substring(
          2
        )}`
);

const transfer = testData.conditional_transfer_order;
const feeInfo = testData.fee_info_user;
const msgHash = starkwareCrypto.getTransferMsgHashWithFee(
  transfer.amount, // - amount (uint63 decimal str)
  transfer.nonce, // - nonce (uint31)
  transfer.sender_vault_id, // - sender_vault_id (uint64)
  transfer.token, // - token (hex str with 0x prefix < prime)
  transfer.target_vault_id, // - target_vault_id (uint64)
  transfer.target_public_key, // - target_public_key (hex str with 0x prefix < prime)
  transfer.expiration_timestamp, // - expiration_timestamp (uint22)
  feeInfo.token_id, // - token (hex str with 0x prefix < prime)
  feeInfo.source_vault_id, // - fee_source_vault_id (uint64)
  feeInfo.fee_limit, // - amount (uint63 decimal str)
  transfer.condition // - condition (hex str with 0x prefix < prime)
);

assert(
  msgHash ===
    testData.meta_data.conditional_transfer_order_with_fee.message_hash.substring(
      2
    ),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.conditional_transfer_order.message_hash.substring(2)
);

// The following is the JSON representation of a transfer:
console.log('Conditional Transfer With Fee JSON representation: ');
console.log(transfer);
console.log('\n');
```

### Adding a matching order to create a settlement

```javascript
const starkwareCrypto = require('@starkware-libs/starkware-crypto-utils');
const testData = require('test/config/signature_test_data.json');

const privateKey = testData.meta_data.party_b_order.private_key.substring(2);
const keyPair = starkwareCrypto.ec.keyFromPrivate(privateKey, 'hex');
const publicKey = starkwareCrypto.ec.keyFromPublic(
  keyPair.getPublic(true, 'hex'),
  'hex'
);
const publicKeyX = publicKey.pub.getX();

assert(
  publicKeyX.toString(16) ===
    testData.settlement.party_b_order.public_key.substring(2),
  `Got: ${publicKeyX.toString(16)}.
        Expected: ${testData.settlement.party_b_order.public_key.substring(2)}`
);

const {party_b_order: partyBOrder} = testData.settlement;
const msgHash = starkwareCrypto.getLimitOrderMsgHash(
  partyBOrder.vault_id_sell, // - vault_sell (uint31)
  partyBOrder.vault_id_buy, // - vault_buy (uint31)
  partyBOrder.amount_sell, // - amount_sell (uint63 decimal str)
  partyBOrder.amount_buy, // - amount_buy (uint63 decimal str)
  partyBOrder.token_sell, // - token_sell (hex str with 0x prefix < prime)
  partyBOrder.token_buy, // - token_buy (hex str with 0x prefix < prime)
  partyBOrder.nonce, // - nonce (uint31)
  partyBOrder.expiration_timestamp // - expiration_timestamp (uint22)
);

assert(
  msgHash === testData.meta_data.party_b_order.message_hash.substring(2),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.party_b_order.message_hash.substring(2)
);

const msgSignature = starkwareCrypto.sign(keyPair, msgHash);
const {r, s} = msgSignature;

assert(starkwareCrypto.verify(publicKey, msgHash, msgSignature));
assert(
  r.toString(16) === partyBOrder.signature.r.substring(2),
  `Got: ${r.toString(16)}. Expected: ${partyBOrder.signature.r.substring(2)}`
);
assert(
  s.toString(16) === partyBOrder.signature.s.substring(2),
  `Got: ${s.toString(16)}. Expected: ${partyBOrder.signature.s.substring(2)}`
);

// The following is the JSON representation of a settlement:
console.log('Settlement JSON representation: ');
console.log(testData.settlement);
```

## Valid transfer with sender_vault_id=2\*\*63+10

```javascript
const transfer = testData.transfer_order_2nd_valid_range;
const feeInfo = testData.fee_info_user;

const msgHash = starkwareCrypto.getTransferMsgHashWithFee(
  transfer.amount, // - amount (uint63 decimal str)
  transfer.nonce, // - nonce (uint31)
  transfer.sender_vault_id, // - sender_vault_id (uint64)
  transfer.token, // - token (hex str with 0x prefix < prime)
  transfer.target_vault_id, // - target_vault_id (uint64)
  transfer.target_public_key, // - target_public_key (hex str with 0x prefix < prime)
  transfer.expiration_timestamp, // - expiration_timestamp (uint22)
  feeInfo.token_id, // - token (hex str with 0x prefix < prime)
  feeInfo.source_vault_id, // - fee_source_vault_id (uint64)
  feeInfo.fee_limit, // - amount (uint63 decimal str)
  transfer.condition // - condition (hex str with 0x prefix < prime)
);

assert(
  msgHash ===
    testData.meta_data.transfer_order_2nd_valid_range.message_hash.substring(2),
  `Got: ${msgHash}. Expected: ` +
    testData.meta_data.transfer_order_2nd_valid_range.message_hash.substring(2)
);

// The following is the JSON representation of a transfer with sender_vault_id in the second
// valid range:
console.log('Transfer JSON representation: ');
console.log(transfer);
console.log('\n');
```

## License

[Apache License 2.0](LICENSE.md)
