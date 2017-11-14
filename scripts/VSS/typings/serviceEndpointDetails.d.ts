declare module "ServiceEndpointDetails" {

    import { IPromise } from 'angular'

    /**
    * Interface defining the configuration that is shared between extension targeted at "ms.vss-endpoint.endpoint-ui-catalog" and the host.
    */
    export interface IServiceEndpointUIExtensionConfig {
        /**
        * It tells contribution whether configuration is for create or update service endpoint.
        */
        action: "create" | "update";
        /**
        * Required only if action is update. 
        * It will be used by contribution to use/ render saved endpoints details.
        */
        serviceEndpointUIExtensionDetails: ServiceEndpointUIExtensionDetails;
        /**
        * If false, host will not call getEndpointDetails.
        * This is a mechanism for contribution to validate the endpoint details entered and show any specific error in case the inputs are not valid.
        */
        validateEndpointDetailsFuncImpl: (validateEndpointDetailsFunc: () => IPromise<boolean>) => void;
        /**
        * Function which will be implemented by contribution to get endpoint details from contribution to host.
        */
        getEndpointDetailsFuncImpl: (getEndpointDetailsFunc: () => IPromise<ServiceEndpointUIExtensionDetails>) => void;
    }

    export interface ServiceEndpointUIExtensionDetails {
        type: string;
        name: string;
        url: string;
        data: { [key: string]: string; };
        authorization: {
            scheme: string;
            parameters: { [key: string]: string; };
        };
    }
}