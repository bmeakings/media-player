'use strict';

(angular
	.module(appName)
	.filter('trustedHTML', ($sce) => {
		return (htmlStr) => {
			return $sce.trustAsHtml(htmlStr);
		};
	})
);
