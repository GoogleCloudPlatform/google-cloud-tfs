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
 * @fileoverview This is a common module holds string constants and string
 * manipulating methods common to all build tasks.
 * @author JimWP@google.com (Jim Przybylinski)
 */
import * as path from 'path';

/**
 * The path to the json key file.
 */
export const jsonKeyFilePath = path.resolve('tempKeyFile.json');

/**
 * The json key file path as a gcloud parameter.
 */
export const credentialParam =
    `--credential-file-override="${jsonKeyFilePath}"`;

/**
 * The path to the kubernetes config file.
 */
export const kubeConfigPath = path.resolve('tempKubeConfig.json');

/**
 * The kubernetes config file path as a kubectl parameter.
 */
export const kubeConfigParam = `--kubeconfig="${kubeConfigPath}"`;

/**
 * An error message sent to the task when there is an unhandled rejection.
 */
export const unhandledRejectionErrorMessage = 'Unhandled rejection!';

/**
 * A debug message sent to the task when a handled rejection could not be
 * removed from the unhandled rejections map.
 */
export const unremovedRejectionMessage = 'Handled rejection not removed!';

/**
 * This function takes a camelCase string and returns a kebab-case version of
 * the string.
 * @param input a camelCase string.
 */
export function toKebabCase(input: string): string {
  return input.replace(/[A-Z]/g, upperToKebab);
}

function upperToKebab(match: string): string {
  return `-${match.toLowerCase()}`;
}
