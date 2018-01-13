// Copyright 2018 Google Inc. All Rights Reserved.
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

'use strict';

import { ServiceEndpointUiExtensionDetails }
    from 'TFS/DistributedTask/ServiceEndpoint/ExtensionContracts';
import * as ko from 'knockout';

class GoogleConnectionWindowgoogleConnectionWindowViewModel {
    public isUpdate: KnockoutObservable<boolean>;
    public connectionName: KnockoutObservable<string>;
    public scope: KnockoutObservable<string>;
    public certificate: KnockoutObservable<string>;
    public audience: KnockoutObservable<string>;
    public issuer: KnockoutObservable<string>;
    public projectid: KnockoutObservable<string>;
    public privatekey: KnockoutObservable<string>;
    public errors: KnockoutObservable<string>;
    public connectionNameFieldColor: KnockoutComputed<string>;
    public scopeFieldColor: KnockoutComputed<string>;
    public certificateFieldColor: KnockoutComputed<string>;

    constructor() {
        this.isUpdate = ko.observable<boolean>();
        this.connectionName = ko.observable('');
        this.scope = ko.observable('');
        this.certificate = ko.observable('');
        this.audience = ko.observable('');
        this.issuer = ko.observable('');
        this.projectid = ko.observable('');
        this.privatekey = ko.observable('');
        this.errors = ko.observable('');

        this.connectionNameFieldColor = ko.computed(
            () => {
                if (this.connectionName().length === 0) {
                    return 'cornsilk';
                } else {
                    return 'white';
                }
            },
            this);

        this.scopeFieldColor = ko.computed(
            () => {
                if (this.scope().length === 0) {
                    return 'cornsilk';
                } else {
                    return 'white';
                }
            },
            this);

        this.certificateFieldColor = ko.computed(
            () => {
                if (this.certificate().length === 0) {
                    return 'cornsilk';
                } else {
                    return 'white';
                }
            },
            this);
    }
}

let viewModel = new GoogleConnectionWindowgoogleConnectionWindowViewModel();

declare let VSS;

VSS.init({ usePlatformStyles: true });

VSS.ready( () => {
    ko.applyBindings(viewModel);
    let configuration = VSS.getConfiguration();
    let details = configuration.serviceEndpointUiExtensionDetails;
    if ((configuration.action === 'update') && (details)) {
        viewModel.isUpdate(true);

        if (details.name) {
            viewModel.connectionName(details.name);
        }

        if (details.data.scope) {
            viewModel.scope(details.data.scope);
        }

        if (details.data.audience) {
            viewModel.audience(details.data.audience);
        }

        if (details.data.issuer) {
            viewModel.issuer(details.data.issuer);
        }

        if (details.data.projectid) {
            viewModel.projectid(details.data.projectid);
        }

        if (details.data.privatekey) {
            viewModel.privatekey(details.data.privatekey);
        }
    }

    configuration.validateEndpointDetailsFuncImpl( () => {
        try {
            viewModel.errors('');
            if ((!viewModel.connectionName()) || (!viewModel.scope()) ||
                    (!viewModel.certificate())) {
                viewModel.errors('All fields are required.');
                return false;
            }

            let jsonKey;
            try {
                jsonKey = JSON.parse(viewModel.certificate());
            } catch (e) {
                viewModel.errors(
                    'Please provide valid json in JSON key file field');
                return false;
            }

            if ((!jsonKey.client_email) || (!jsonKey.token_uri) ||
                (!jsonKey.private_key) || (!jsonKey.project_id)) {
                viewModel.errors('All fields are required.');
                return false;
            }

            return true;
        } catch (e) {
            viewModel.errors(e.message + ' Details:' + e.stack);
            return false;
        }
    });

    configuration.getEndpointDetailsFuncImpl( () => {
        try {
            let jsonKeyFileContent =
                JSON.parse(viewModel.certificate());

            return {
                type: null,
                data: { projectid: jsonKeyFileContent.project_id },
                authorization: {
                    parameters: {
                        certificate:
                            viewModel.certificate(),
                        scope: viewModel.scope(),
                        issuer: jsonKeyFileContent.client_email,
                        audience: jsonKeyFileContent.token_uri,
                        privatekey: jsonKeyFileContent.private_key
                    },
                    scheme: 'JWT'
                },
                url: 'https://www.googleapis.com/',
                name: viewModel.connectionName(),
            } as ServiceEndpointUiExtensionDetails;
        } catch (e) {
            viewModel.errors(e.message + ' Details:' + e.stack);
            return null;
        }
    });
});
VSS.notifyLoadSucceeded();