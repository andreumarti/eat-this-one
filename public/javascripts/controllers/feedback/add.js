angular.module('eat-this-one')
    .controller('FeedbackAddController', ['$scope', 'redirecter', 'appStatus', 'notifier', 'eatConfig', 'authManager', 'formsManager', 'newLogRequest', 'menuManager', 'addFeedbackRequest', function($scope, redirecter, appStatus, notifier, eatConfig, authManager, formsManager, newLogRequest, menuManager, addFeedbackRequest) {

    $scope.lang = $.eatLang.lang;
    $scope.auth = authManager;
    $scope.redirectAction = redirecter.redirectAction;
    $scope.menu = menuManager;

    // Define header.
    $scope.pageTitle = $scope.lang.feedback;
    $scope.actionIcons = [
        {
            name : $scope.lang.save,
            icon : 'glyphicon glyphicon-ok',
            callback : 'save'
        }
    ];
    $scope.menuIcons = [
        {
            name : $scope.lang.dishes,
            icon : 'glyphicon glyphicon-piggy-bank',
            callback : 'index'
        }, {
            name : $scope.lang.bookedmeals,
            icon : 'glyphicon glyphicon-cutlery',
            callback : 'indexMeals'
        }
    ];

    $scope.showToggleMenu = false;
    if ($scope.auth.isAuthenticated()) {
        $scope.showToggleMenu = true;
    }

    $scope.feedback = {
        name: 'feedback',
        label: $scope.lang.feedback,
        validation: ['required', 'text'],
        value: ''
    };

    $scope.save = function() {

        // Validate the form text forms, the other ones have a default value.
        if (!formsManager.validate(['feedback'], $scope)) {
            return;
        }

        appStatus.waiting('feedback');
        newLogRequest('click', 'feedback-add-confirm');

        var feedbackCallback = function(data) {
            appStatus.completed('feedback');
            notifier.show($scope.lang.thanks, $scope.lang.feedbackaddedinfo, function() {
                redirecter.redirect('index.html');
            });
        };
        var feedbackErrorCallback = function(data, errorStatus, errorMsg) {
            appStatus.completed('feedback');
            var msg = $scope.lang.errorfeedback + '. "' + errorStatus + '": ' + data;
            notifier.show($scope.lang.error, msg);
        };
        addFeedbackRequest($scope, $scope.feedback.value, feedbackCallback, feedbackErrorCallback);
    };

    // Redirects to the user meals list.
    $scope.indexMeals = function() {
        newLogRequest('click', 'meals-index');
        redirecter.redirect('meals/index.html');
    };

    // Redirects to index.
    $scope.index = function() {
        newLogRequest('click', 'index');
        redirecter.redirect('index.html');
    };
}]);