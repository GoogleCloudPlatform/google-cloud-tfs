define(["require", "exports", "knockout"], function (require, exports, ko) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    let viewModel = new MyViewModel();
    function MyViewModel() {
        this.isUpdate = ko.observable();
        this.connectionName = ko.observable('');
        this.scope = ko.observable('');
        this.certificate = ko.observable('');
        this.audience = ko.observable('');
        this.issuer = ko.observable('');
        this.projectid = ko.observable('');
        this.privatekey = ko.observable('');
        this.errors = ko.observable('');
        this.connectionNameFieldColor = ko.computed(function () {
            if (this.connectionName().length === 0) {
                return 'cornsilk';
            }
            else {
                return 'white';
            }
        }, this);
        this.scopeFieldColor = ko.computed(function () {
            if (this.scope().length === 0) {
                return 'cornsilk';
            }
            else {
                return 'white';
            }
        }, this);
        this.certificateFieldColor = ko.computed(function () {
            if (this.certificate().length === 0) {
                return 'cornsilk';
            }
            else {
                return 'white';
            }
        }, this);
    }
    VSS.init({ usePlatformStyles: true });
    VSS.ready(function () {
        ko.applyBindings(viewModel);
        let configuration = VSS.getConfiguration();
        if ((configuration.action === 'update') &&
            (!!configuration.serviceEndpointUiExtensionDetails)) {
            viewModel.isUpdate(true);
            if (configuration.serviceEndpointUiExtensionDetails.name) {
                viewModel.connectionName(configuration.serviceEndpointUiExtensionDetails.name);
            }
            if (configuration.serviceEndpointUiExtensionDetails.data.scope) {
                viewModel.scope(configuration.serviceEndpointUiExtensionDetails.data.scope);
            }
            if (configuration.serviceEndpointUiExtensionDetails.data.audience) {
                viewModel.audience(configuration.serviceEndpointUiExtensionDetails.data.audience);
            }
            if (configuration.serviceEndpointUiExtensionDetails.data.issuer) {
                viewModel.issuer(configuration.serviceEndpointUiExtensionDetails.data.issuer);
            }
            if (configuration.serviceEndpointUiExtensionDetails.data.projectid) {
                viewModel.projectid(configuration.serviceEndpointUiExtensionDetails.data.projectid);
            }
            if (configuration.serviceEndpointUiExtensionDetails.data.privatekey) {
                viewModel.privatekey(configuration.serviceEndpointUiExtensionDetails.data.privatekey);
            }
        }
        configuration.validateEndpointDetailsFuncImpl(function () {
            viewModel.errors('');
            if ((!viewModel.connectionName()) || (!viewModel.scope()) ||
                (!viewModel.certificate())) {
                viewModel.errors('All fields are required.');
                return false;
            }
            let jsonKeyFileContent;
            try {
                jsonKeyFileContent = JSON.parse(viewModel.certificate());
            }
            catch (e) {
                viewModel.errors('Please provide valid json in JSON key file field');
                return false;
            }
            if ((!jsonKeyFileContent.client_email) || (!jsonKeyFileContent.token_uri) ||
                (!jsonKeyFileContent.private_key) || (!jsonKeyFileContent.project_id)) {
                viewModel.errors('All fields are required.');
                return false;
            }
            return true;
        });
        configuration.getEndpointDetailsFuncImpl(function () {
            let serviceEndpoint = {};
            let jsonKeyFileContent = JSON.parse(viewModel.certificate());
            serviceEndpoint.data = { projectid: jsonKeyFileContent.project_id };
            serviceEndpoint.authorization = {
                parameters: {
                    certificate: viewModel.certificate(),
                    scope: viewModel.scope(),
                    issuer: jsonKeyFileContent.client_email,
                    audience: jsonKeyFileContent.token_uri,
                    privatekey: jsonKeyFileContent.private_key
                },
                scheme: 'JWT'
            };
            serviceEndpoint.url = 'https://www.googleapis.com/';
            serviceEndpoint.name = viewModel.connectionName();
            let serviceEndpointUiExtensionDetails = serviceEndpoint;
            return serviceEndpointUiExtensionDetails;
        });
    });
    VSS.notifyLoadSucceeded();
});
