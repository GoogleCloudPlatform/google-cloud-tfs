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
 * @fileoverview A set of interfaces useful for kubernetes operations.
 * @author przybjw@google.com (Jim Przybylinski)
 */

/**
 * The recursive definition of a kubernetes configuration file.
 */
export interface KubeResource {
  [key: string]: KubeResource|string|boolean|number|KubeResource[]|string[]|
      number[];
}

/**
 * Part of the object model of a kubernetes deployment.
 */
export interface Deployment extends KubeResource {
  metadata: {name: string};
  spec: {
    replicas: number;
    template: {
      spec: {
        containers: ImageContainer[];
      };
    };
  };
}

interface ImageContainer extends KubeResource {
  image: string;
}
