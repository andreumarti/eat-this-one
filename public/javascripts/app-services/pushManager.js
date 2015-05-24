angular.module('eat-this-one')
    .factory('pushManager', ['$window', 'eatConfig', function($window, eatConfig) {

    return {

        // Here we register which functions will handle the notifications.
        register : function() {

            if (device.platform == 'android' ||
                    device.platform == 'Android' ||
                    device.platform == "amazon-fireos" ) {

                $window.plugins.pushNotification.register(
                    this.registered,
                    this.errorHandler,
                    {
                        "senderID": eatConfig.gcmSenderId,
                        "ecb": "notificationsHandler"
                    }
                );

            } else {

                $window.plugins.pushNotification.register(
                    this.registeredAPN,
                    this.errorAPNHandler,
                    {
                        "badge":"true",
                        "sound":"true",
                        "alert":"true",
                        "ecb":"apnNotificationsHandler"
                    }
                );
            }
        },

        registered : function(result) {
            console.log('Registered in Google Cloud Messaging: ' + result);
        },

        registeredAPN : function(token) {

            // We always update it if it is different.
            if (token != localStorage.getItem('apnToken')) {
                console.log('Registered in APN: ' + token);

                localStorage.setItem('apnToken', token);
                if (localStorage.getItem('usingFakeApnToken') !== null) {
                    localStorage.removeItem('usingFakeApnToken');
                }

                var bodyscope = angular.element('#id-body');
                bodyscope.ready(function() {
                    var updateApnTokenRequest = bodyscope.injector().get('updateApnTokenRequest');
                    updateApnTokenRequest();
                });
            }
        },

        errorHandler : function(error) {
            console.log('Error, not able to get the registration ID: ' + error);
            // Generating a random one, it would be later replaced on update.
            var randomNumber = Math.random() + new Date().getTime();
            localStorage.setItem('gcmRegId', randomNumber);
        },

        errorAPNHandler : function(error) {
            console.log('Error, not able to get the APN token: ' + error);
            // Generating a random one, it would be later replaced on update.
            var randomNumber = Math.random() + new Date().getTime();
            localStorage.setItem('apnToken', randomNumber);
            localStorage.setItem('usingFakeApnToken', true);
        }

    };

}]);

function notificationRedirectUser(bodyscope, payload, prefix) {

    var newLogRequest = bodyscope.injector().get('newLogRequest');
    var redirecter = bodyscope.injector().get('redirecter');

    var url = payload.url;
    if (typeof url === "undefined") {
        url = 'index.html';
    }

    var objectid = payload.objectid;
    if (objectid !== null &&
            typeof objectid !== "undefined" &&
            objectid !== false) {
        newLogRequest('click', prefix + '-notification', payload.type + '-' + objectid);
        redirecter.redirect(url);
    } else {
        newLogRequest('click', prefix + '-notification', payload.type);
        redirecter.redirect(url);
    }
}

function notificationsHandler(e) {
    // All cordova calls should be inside a deviceready listener.
    document.addEventListener('deviceready', function() {

        // We wait for the body to be ready.
        var bodyscope = angular.element('#id-body');
        bodyscope.ready(function() {

            // We inject the service here as we are out of angular init process.
            var newLogRequest = bodyscope.injector().get('newLogRequest');

            switch(e.event) {

                // Storing the registration id.
                case 'registered':

                    // Storing the registration id.
                    if (e.regid.length > 0) {

                        var previousGcmRegId = localStorage.getItem('gcmRegId');

                        if (previousGcmRegId === null ||
                                previousGcmRegId === false ||
                                previousGcmRegId === '') {
                            // Store it if there was nothing before.
                            localStorage.setItem('gcmRegId', e.regid);
                            newLogRequest('create', 'gcm-registration', e.regid);
                        } else if (previousGcmRegId != e.regid) {
                            // We also check that the current one is different.
                            localStorage.setItem('gcmRegId', e.regid);
                            newLogRequest('update', 'gcm-registration', e.regid);

                            // We also update the backend.
                            var updateRegIdRequest = bodyscope.injector().get('updateRegIdRequest');
                            updateRegIdRequest();
                        } else {
                            // Let's not log this.
                        }
                    } else {
                        newLogRequest('error', 'gcm-registration', 'no registration id');
                    }
                    break;

                case 'message':
                    notificationRedirectUser(bodyscope, e.payload, 'gcm');
                    break;
                case 'error':
                    newLogRequest('error', 'gcm-error', e.msg);
                    console.log('Error: Message can not be received. ' + e.msg);
                    break;
                default:
                    newLogRequest('error', 'gcm-unknown');
                    console.log('Error: Unknown event received');
                    break;
            }
        });
    });
}

function apnNotificationsHandler(e) {

    // All cordova calls should be inside a deviceready listener.
    document.addEventListener('deviceready', function() {

        // We wait for the body to be ready.
        var bodyscope = angular.element('#id-body');
        bodyscope.ready(function() {
            notificationRedirectUser(bodyscope, e.payload, 'apn');
        });
    });
}
