'use strict';

(angular
	.module(appName)
	.directive('onFileChange', () => {
		return {
			restrict: 'A',
			link: (scope, element, attrs) => {
				const onChangeHandler = scope.$eval(attrs.onFileChange);

				element.bind('change', () => {
					scope.$apply(() => {
						const files = element[0].files;

						if (files)
							onChangeHandler(files);
					});
				});
			}
		};
	})
);
