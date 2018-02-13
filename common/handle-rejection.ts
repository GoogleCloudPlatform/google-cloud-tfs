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
 * @fileoverview This module provides methods to handle rejections, and handles
 *   unhandled rejections.
 * @author JimWP@google.com (Jim Przybylinski)
 */

import * as task from 'vsts-task-lib/task';

import {AggregateError} from './aggregate-error';
import * as s from './strings';

process.on('unhandledRejection', addUnhandled);
process.on('rejectionHandled', removeUnhandled);
process.on('exit', failUnhandled);

/**
 * This method catches any promise rejection and fails the task using the error
 * message.
 * @param promise The promise or promise function to catch.
 */
export async function catchAll<T>(promise: PromiseLike<T>|
                                  (() => void)): Promise<void> {
  try {
    if (promise instanceof Function) {
      promise();
    } else {
      await promise;
    }
  } catch (e) {
    let message: string;
    if (e instanceof Error) {
      message = e.message;
      const stackLines = e.stack.split(/\n/);
      for (const stackLine of stackLines) {
        task.debug(stackLine);
      }
      if (e instanceof AggregateError) {
        for (const innerError of e.innerErrors) {
          task.error(innerError.message);
          const innerStackLines = innerError.stack.split(/\n/);
          for (const stackLine of innerStackLines) {
            task.debug(stackLine);
          }
        }
      }
    } else {
      message = e.toString();
    }
    task.setResult(task.TaskResult.Failed, message);
  }
}

const unhandledRejections = new Map<PromiseLike<{}>, Error>();

function addUnhandled(reason: Error, promise: PromiseLike<{}>): void {
  unhandledRejections.set(promise, reason);
}

function removeUnhandled(_: {}, promise: PromiseLike<{}>): void {
  if (!unhandledRejections.delete(promise)) {
    task.warning(s.unremovedRejectionMessage);
    for (const arg of arguments) {
      console.log(arg);
    }
  }
}

function failUnhandled(): void {
  for (const reason of unhandledRejections.values()) {
    task.setResult(task.TaskResult.Failed, reason.message);
  }
}
