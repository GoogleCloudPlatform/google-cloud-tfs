'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const ko = require("knockout");
class GoogleConnectionWindowgoogleConnectionWindowViewModel {
    constructor() {
        this.isUpdate = ko.observable();
        this.connectionName = ko.observable('');
        this.scope = ko.observable('');
        this.certificate = ko.observable('');
        this.audience = ko.observable('');
        this.issuer = ko.observable('');
        this.projectid = ko.observable('');
        this.privatekey = ko.observable('');
        this.errors = ko.observable('');
        this.connectionNameFieldColor = ko.computed(() => {
            if (this.connectionName().length === 0) {
                return 'cornsilk';
            }
            else {
                return 'white';
            }
        }, this);
        this.scopeFieldColor = ko.computed(() => {
            if (this.scope().length === 0) {
                return 'cornsilk';
            }
            else {
                return 'white';
            }
        }, this);
        this.certificateFieldColor = ko.computed(() => {
            if (this.certificate().length === 0) {
                return 'cornsilk';
            }
            else {
                return 'white';
            }
        }, this);
    }
}
let googleConnectionWindowViewModel = new GoogleConnectionWindowgoogleConnectionWindowViewModel();
VSS.init({ usePlatformStyles: true });
VSS.ready(function () {
    ko.applyBindings(googleConnectionWindowViewModel);
    let configuration = VSS.getConfiguration();
    if ((configuration.action === 'update') &&
        (!!configuration.serviceEndpointUiExtensionDetails)) {
        googleConnectionWindowViewModel.isUpdate(true);
        if (configuration.serviceEndpointUiExtensionDetails.name) {
            googleConnectionWindowViewModel.connectionName(configuration.serviceEndpointUiExtensionDetails.name);
        }
        if (configuration.serviceEndpointUiExtensionDetails.data.scope) {
            googleConnectionWindowViewModel.scope(configuration.serviceEndpointUiExtensionDetails.data.scope);
        }
        if (configuration.serviceEndpointUiExtensionDetails.data.audience) {
            googleConnectionWindowViewModel.audience(configuration.serviceEndpointUiExtensionDetails.data.audience);
        }
        if (configuration.serviceEndpointUiExtensionDetails.data.issuer) {
            googleConnectionWindowViewModel.issuer(configuration.serviceEndpointUiExtensionDetails.data.issuer);
        }
        if (configuration.serviceEndpointUiExtensionDetails.data.projectid) {
            googleConnectionWindowViewModel.projectid(configuration.serviceEndpointUiExtensionDetails.data.projectid);
        }
        if (configuration.serviceEndpointUiExtensionDetails.data.privatekey) {
            googleConnectionWindowViewModel.privatekey(configuration.serviceEndpointUiExtensionDetails.data.privatekey);
        }
    }
    configuration.validateEndpointDetailsFuncImpl(function () {
        try {
            googleConnectionWindowViewModel.errors('');
            if ((!googleConnectionWindowViewModel.connectionName()) || (!googleConnectionWindowViewModel.scope()) ||
                (!googleConnectionWindowViewModel.certificate())) {
                googleConnectionWindowViewModel.errors('All fields are required.');
                    return false;
                }
                let jsonKeyFileContent;
                try {
                jsonKeyFileContent = JSON.parse(googleConnectionWindowViewModel.certificate());
                }
                catch (e) {
                googleConnectionWindowViewModel.errors('Please provide valid json in JSON key file field');
                    return false;
                }
                if ((!jsonKeyFileContent.client_email) || (!jsonKeyFileContent.token_uri) ||
                    (!jsonKeyFileContent.private_key) || (!jsonKeyFileContent.project_id)) {
                googleConnectionWindowViewModel.errors('All fields are required.');
                    return false;
                }
                return true;
        }
        catch (e) {
            googleConnectionWindowViewModel.errors(e.message + " Details:" + e.stack);
            return false;
        }
    });
    configuration.getEndpointDetailsFuncImpl(function () {
        try {
                let serviceEndpoint = {};
            let jsonKeyFileContent = JSON.parse(googleConnectionWindowViewModel.certificate());
                serviceEndpoint.data = { projectid: jsonKeyFileContent.project_id };
                serviceEndpoint.authorization = {
                    parameters: {
                    certificate: googleConnectionWindowViewModel.certificate(),
                    scope: googleConnectionWindowViewModel.scope(),
                        issuer: jsonKeyFileContent.client_email,
                        audience: jsonKeyFileContent.token_uri,
                        privatekey: jsonKeyFileContent.private_key
                    },
                    scheme: 'JWT'
                };
                serviceEndpoint.url = 'https://www.googleapis.com/';
            serviceEndpoint.name = googleConnectionWindowViewModel.connectionName();
                let serviceEndpointUiExtensionDetails = serviceEndpoint;
                return serviceEndpointUiExtensionDetails;
        }
        catch (e) {
            googleConnectionWindowViewModel.errors(e.message + " Details:" + e.stack);
            return null;
        }
    });
});
VSS.notifyLoadSucceeded();
//# sourceMappingURL=main.js.map