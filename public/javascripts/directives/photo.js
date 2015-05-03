angular.module('eat-this-one').directive('eatPhoto', ['eatConfig', 'newLogRequest', function(eatConfig, newLogRequest) {

    // TODO: This should be a service as it is not working in web.
    return {
        restrict: 'E',
        scope: {
            element: '='
        },
        link : function(scope) {

            // Import lang strings.
            scope.lang = $.eatLang.lang;

            scope.onPictureSuccess = function(imageData) {
                $('#id-dish-img-card').removeClass('hidden');
                $('#id-dish-img-card').css('display', 'block');
                $('#id-dish-img').prop('src', "data:image/jpeg;base64," + imageData);
                $('#id-photobtn').css('display', 'none');
                $('#id-imagebtn').css('display', 'none');

                // And send data back to the controller scope.
                scope.element.value = imageData;
            };

            scope.onCapturePhotoFail = function(message) {
                newLogRequest('error', 'photo-take', message);
                console.log('Error capturing the image: ' + message);
            };

            scope.onSelectImageFail = function(message) {
                newLogRequest('error', 'select-image', message);
                console.log('Error selecting the image: ' + message);
            };

            var quality = 50;
            var size = 512;
            document.addEventListener("deviceready", function onDeviceReady() {
                if (device.platform.toLowerCase() === "ios") {
                    // We reach memory limits in iOS.
                    quality = 10;
                    size = 256;
                }
            }, false);

            scope.capturePhoto = function() {
                navigator.camera.getPicture(scope.onPictureSuccess, scope.onCapturePhotoFail, {
                    quality: quality,
                    targetWidth: size,
                    destinationType: Camera.DestinationType.DATA_URL,
                    saveToPhotoAlbum: true,
                    encodingType: Camera.EncodingType.JPEG,
                    correctOrientation: true,
                    allowEdit: false
                });
            };

            scope.selectImage = function() {
                navigator.camera.getPicture(scope.onPictureSuccess, scope.onSelectImageFail, {
                    targetWidth: 512,
                    destinationType: Camera.DestinationType.DATA_URL,
                    sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                    mediaType: Camera.MediaType.PICTURE,
                    correctOrientation: true,
                    allowEdit: false
                });
            };
        },
        templateUrl: "templates/photo.html"
    };

}]);
