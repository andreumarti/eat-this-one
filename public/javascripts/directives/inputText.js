angular.module('eat-this-one').directive('eatInputText', ['$mdToast', 'formsManager', function($mdToast, formsManager) {

    return {
        restrict: 'E',
        scope: {
            element: '=',
        },
        link: function(scope, element) {
            var input = angular.element(element.find('input'));

            // We want to test just this field so we hack around formsManager API.
            var fields = {};
            fields[scope.element.name] = scope.element;

            // To validate the form.
            var validateForm = function(e) {
                formsManager.validate([scope.element.name], fields);
            };
            input.on('keyup', validateForm);
            input.on('change', validateForm);

            // iOS virtual keyboard bug. http://getbootstrap.com/getting-started/#virtual-keyboards
            input.on('focus', function(e) {
                angular.element('.navbar-fixed-top').css('position', 'absolute');
            });
            input.on('blur', function(e) {
                angular.element('.navbar-fixed-top').css('position', 'fixed');
            });

            // Only if a placeholder is set.
            if (typeof scope.element.placeholder !== "undefined" &&
                    scope.element.placeholder !== null &&
                    scope.element.placeholder !== false) {

                // To show a toast notification (replacement of the normal placeholder behaviour).
                var showToast = function() {

                    // Default to almost 1 second.
                    var delay = 700;

                    // Only when the field has not value.
                    if (scope.element.value === "") {

                        // Overwrite the default delay if necessary.
                        if (typeof scope.element.infodelay !== "undefined") {
                            delay = scope.element.infodelay;
                        }

                        setTimeout(function() {
                            $mdToast.show(
                                $mdToast.simple()
                                    .content(scope.element.placeholder)
                                    .position('top right')
                                    .hideDelay(delay)
                            );
                        }, 500);
                    }
                };

                // We only want tips if the user is new, considering
                // new a user that never added a dish.
                if (localStorage.getItem('disableTips') === null) {
                    input.on('focus', showToast);
                }
            }

        },
        templateUrl: "templates/input-text.html"
    };

}]);
