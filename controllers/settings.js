'use strict';

(angular
	.module(appName)
	.controller('SettingsCtrl', ($scope, $rootScope, $http) => {
		const savedSettings = JSON.parse(localStorage.getItem('settings') || '{}');

		$scope.settings = {
			'language': (savedSettings.language || $scope.$parent.currLang),
			'langsMenu': {},
			'resize_on_play': (savedSettings.resize_on_play || false),
			'centre_on_play': (savedSettings.centre_on_play || false),
			'exit_on_finish': (savedSettings.exit_on_finish || false),
			'audio_visualiser': (savedSettings.audio_visualiser || false),
		};

		function getLanguages() {
			($http
				.get('./l10n/_langs.json')
				.then((response) => {
					try {
						const jsonDoc = response.data;

						for (const i in jsonDoc) {
							if (i != 'END')
								$scope.settings.langsMenu[i] = jsonDoc[i];
						}
					}
					catch (e) {
						console.log(e);
					}
				})
			);
		}

		$scope.langChanged = function() {
			const newLang = $scope.settings.language;

			$scope.$parent.setLanguage(newLang);
		};

		$scope.$watchCollection('settings', () => {
			localStorage.setItem('settings', JSON.stringify($scope.settings));
			$rootScope.$broadcast('settingsChanged', $scope.settings);
		});

		getLanguages();
	})
);
