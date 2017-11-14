// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview This is a common module for string formatting functions.
 * @author JimWP@google.com (Jim Przybylinski)
 */

/**
 * Creates a string of a number padded with leading zeros.
 * @param num The number to add leading zeros too.
 * @param size The minimum length of the resulting string.
 * @returns {string} A string representation of the number padded with leading
 *   zeros.
 */
export function padLeadingZero(num: number, size: number): string {
  size = Math.floor(size);
  const s = Math.floor(num).toString();
  if (s.length >= size) {
    return s;
  } else {
    return '0'.repeat(size - s.length) + s;
  }
}

/**
 * Returns the ISO string for the current date and time. Can be mocked.
 */
export function isoNowString(): string {
  const now = new Date();
  const year = padLeadingZero(now.getUTCFullYear(), 4);
  const month = padLeadingZero(now.getUTCMonth(), 2);
  const day = padLeadingZero(now.getUTCDay(), 2);
  const hour = padLeadingZero(now.getUTCHours(), 2);
  const minute = padLeadingZero(now.getUTCMinutes(), 2);
  const second = padLeadingZero(now.getUTCSeconds(), 2);
  return `${year}${month}${day}t${hour}${minute}${second}`;
}
