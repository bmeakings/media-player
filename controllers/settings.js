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
			'fullscreen_on_play': (savedSettings.fullscreen_on_play || false),
			'exit_on_finish': (savedSettings.exit_on_finish || false),
			'audio_visualiser': (savedSettings.audio_visualiser || false),
			'controls_visible': (savedSettings.controls_visible || false),
			'auto_show_subs': (savedSettings.auto_show_subs || false),
			'jump_time_amount': (savedSettings.jump_time_amount || 5),
			'get_album_art': (savedSettings.get_album_art || false),
		};

		$scope.isBoolean = (val) => {
			return (typeof val == 'boolean');
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

		$scope.$watchCollection('settings', () => {
			localStorage.setItem('settings', JSON.stringify($scope.settings));
			$rootScope.$broadcast('settingsChanged', $scope.settings);
		});

		getLanguages();
	})
);
