define(["require", "exports", "knockout"], function (require, exports, ko) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var viewModel = new MyViewModel();
    function MyViewModel() {
        this.isUpdate = ko.observable();
        this.connectionName = ko.observable("");
        this.scope = ko.observable("");
        this.certificate = ko.observable("");
        this.audience = ko.observable("");
        this.issuer = ko.observable("");
        this.projectid = ko.observable("");
        this.privatekey = ko.observable("");
        this.errors = ko.observable("");
        this.connectionNameFieldColor = ko.computed(function () {
            if (this.connectionName().length == 0)
                return '#fff4ce';
            else
                return '#ffffff';
        }, this);
        this.scopeFieldColor = ko.computed(function () {
            if (this.scope().length == 0)
                return '#fff4ce';
            else
                return '#ffffff';
        }, this);
        this.certificateFieldColor = ko.computed(function () {
            if (this.certificate().length == 0)
                return '#fff4ce';
            else
                return '#ffffff';
        }, this);
    }
    VSS.init({
        usePlatformStyles: true
    });
    VSS.ready(function () {
        ko.applyBindings(viewModel);
        var configuration = VSS.getConfiguration();
        if ((configuration.action == "update") && (!!configuration.serviceEndpointUIExtensionDetails)) {
            viewModel.isUpdate(true);
            if (configuration.serviceEndpointUIExtensionDetails.name) {
                viewModel.connectionName(configuration.serviceEndpointUIExtensionDetails.name);
            }
            if (configuration.serviceEndpointUIExtensionDetails.data.scope) {
                viewModel.scope(configuration.serviceEndpointUIExtensionDetails.data.scope);
            }
            if (configuration.serviceEndpointUIExtensionDetails.data.audience) {
                viewModel.audience(configuration.serviceEndpointUIExtensionDetails.data.audience);
            }
            if (configuration.serviceEndpointUIExtensionDetails.data.issuer) {
                viewModel.issuer(configuration.serviceEndpointUIExtensionDetails.data.issuer);
            }
            if (configuration.serviceEndpointUIExtensionDetails.data.projectid) {
                viewModel.projectid(configuration.serviceEndpointUIExtensionDetails.data.projectid);
            }
            if (configuration.serviceEndpointUIExtensionDetails.data.privatekey) {
                viewModel.privatekey(configuration.serviceEndpointUIExtensionDetails.data.privatekey);
            }
        }
        configuration.validateEndpointDetailsFuncImpl(function () {
            if ((!viewModel.connectionName()) || (!viewModel.scope()) || (!viewModel.certificate())) {
                viewModel.errors("All fields are required.");
                return false;
            }
            try {
                var jsonKeyFileContent = JSON.parse(viewModel.certificate());
            }
            catch (e) {
                viewModel.errors("Please provide valid json in 'JSON Key File' field");
                return false;
            }
            if ((!jsonKeyFileContent.client_email) || (!jsonKeyFileContent.token_uri) || (!jsonKeyFileContent.private_key) || (!jsonKeyFileContent.project_id)) {
                viewModel.errors("All fields are required.");
                return false;
            }
            return true;
        });
        configuration.getEndpointDetailsFuncImpl(function () {
            var serviceEndpoint = {};
            var gcpEndpointDetails = {};
            var jsonKeyFileContent = JSON.parse(viewModel.certificate());
            gcpEndpointDetails.issuer = jsonKeyFileContent.client_email;
            gcpEndpointDetails.audience = jsonKeyFileContent.token_uri;
            gcpEndpointDetails.privatekey = jsonKeyFileContent.private_key;
            gcpEndpointDetails.projectid = jsonKeyFileContent.project_id;
            serviceEndpoint.data = {
                projectid: gcpEndpointDetails.projectid
            };
            serviceEndpoint.authorization = {
                parameters: {
                    certificate: viewModel.certificate(),
                    scope: viewModel.scope(),
                    issuer: gcpEndpointDetails.issuer,
                    audience: gcpEndpointDetails.audience,
                    privatekey: gcpEndpointDetails.privatekey
                },
                scheme: "JWT"
            };
            serviceEndpoint.url = "https://www.googleapis.com/";
            serviceEndpoint.name = viewModel.connectionName();
            var serviceEndpointUIExtensionDetails = serviceEndpoint;
            return serviceEndpointUIExtensionDetails;
        });
    });
    VSS.notifyLoadSucceeded();
});
