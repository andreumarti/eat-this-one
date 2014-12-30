angular.module('eat-this-one').factory('dishFormatter', ['notifier', 'mapsManager', 'datesConverter', function(notifier, mapsManager, datesConverter) {

    return function($scope, dishData) {

        $scope.dish = dishData;
        $scope.dish.map = mapsManager.getStaticMap($scope.dish.loc.address);

        // Nice when format.
        $scope.dish.when = datesConverter.timeToDay(Date.parse($scope.dish.when));

        // Fill form values if they exist.
        var fields = ['userid', 'name', 'description', 'when', 'nportions', 'donation'];
        for (var fieldName in fields) {
            if ($scope[fields[fieldName]]) {
                $scope[fields[fieldName]].value = $scope.dish[fields[fieldName]];
            }
        }

        // Chef name requires special treatment.
        if ($scope.dish.user.name === 'deleted') {
            $scope.dish.user.name = $scope.lang.deleteduser;
        }

        // The photo is not required so it may not be there.
        if ($scope.dish.photo) {
            var smallimage = $('#id-smallimage');
            if (smallimage) {
                smallimage.css('display', 'block');
                // Image already returns prefixed with ...jpeg:base64;.
                smallimage.prop('src', $scope.dish.photo);
            }
        }

        // Number of remaining portions to book.
        if ($scope.dish.nportions == 0) {
            // No text as they are unlimited, rendundant info.
            $scope.dish.remainingportions = -1;
        } else {
            $scope.dish.remainingportions = $scope.dish.nportions - dishData.bookedmeals;
            if ($scope.dish.remainingportions == 1) {
                // Show last portion text.
                $scope.dishusefulinfotext = $scope.lang.lastportion;

            } else if ($scope.dish.remainingportions == 0) {
                // Show all booked text.
                $scope.dishusefulinfotext = $scope.lang.allportionsbooked;
            } else {
                // No text if more than one portion.
            }
        }

        // If the user already booked the dish this is more useful than any other info.
        if ($scope.dish.booked) {
            $scope.dishusefulinfotext = $scope.lang.alreadybookedtext;
        }

        // Set the page title.
        $scope.pageTitle = $scope.dish.name;
    };

}]);