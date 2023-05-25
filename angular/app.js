'use strict';

const appName = 'MediaPlayer';

(angular
	.module(appName, ['ngMaterial'])
	.controller('MainCtrl', ($scope, $http) => {
		const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');

		$scope.settingsOpen = false;
		$scope.currLang = (savedSettings.language || 'en');
		$scope.langStrings = {};

        $scope.setLanguage = (lang) => {
            ($http
                .get('./l10n/' + lang + '.json')
                .then((response) => {
                    try {
                        $scope.langStrings = response.data;
                    }
                    catch (e) {
                        console.log(e);
                    }
                })
            );
        };

		$scope.openSettings = () => {
			$scope.settingsOpen = true;
		};

		$scope.closeSettings = () => {
			$scope.settingsOpen = false;
		};

        $scope.setLanguage($scope.currLang);
	})
);
