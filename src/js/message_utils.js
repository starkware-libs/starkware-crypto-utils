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

const assert = require('assert');

/*
 Asserts input is equal to or greater then lowerBound and lower than upperBound.
 Assert message specifies inputName.
 input, lowerBound, and upperBound should be of type BN.
 inputName should be a string.
*/
function assertInRange(input, lowerBound, upperBound, inputName = '') {
  const messageSuffix =
    inputName === '' ? 'invalid length' : `invalid ${inputName} length`;
  assert(
    input.gte(lowerBound) && input.lt(upperBound),
    `Message not signable, ${messageSuffix}.`
  );
}

module.exports = {
  assertInRange // Function.
};
