'use strict';

(angular
	.module(appName)
	.controller('PlayerCtrl', ($scope, $timeout) => {
		const savedVolume = localStorage.getItem('volume');
		const videoObj = document.getElementById('videoPlayer');

		let updateTimer = null;
		let seekerDelay = null;
		// let playOpenedFile = true;
		let volBeforeMute = 0.0;
		let showControlTimer = null;
		let showVolumeTimer = null;
		let fullScreen = false;
		let currFileType = '';
		let currFilePath = '';
		let currFileName = '';
		let appendPlaylist = false;

		$scope.settings = {};
		// $scope.showControls = false;
		$scope.showControls = true;
		$scope.currVolume = parseFloat(savedVolume) || 0.5;
		$scope.settingsOpen = false;
		$scope.appVersion = '0.0.1';
		$scope.volumeImg = '';
		$scope.volumePcnt = 0;
		$scope.volumeSlider = {'value': 0.0};
		$scope.speedSlider = {'value': 0.0};
		$scope.openFiles = '';
		$scope.currPlayIdx = 0;
		$scope.playlist = [];
		$scope.statusIcon = '';
		$scope.appStartup = true;
		$scope.showVolSlider = false;

		$scope.playback = {
			'title': '',
			'playing': false,
			'time': 0.0,
			'duration': 0.0,
			'timePlayed': '00:00:00',
			'timeTotal': '00:00:00',
			'loop': false,
		};

		function setPlaybackStatus(status) {
			$timeout(() => {
				$scope.playback.playing = status;
			});
		}

		function addToPlaylist(files) {
			const playlistEmpty = ($scope.playlist.length == 0);

			$scope.appStartup = false;

			for (const f of files)
				$scope.playlist.push(f);

			if (!$scope.playback.playing && playlistEmpty)
				playMedia(0);
		}

		function playMedia(index) {
			const file = $scope.playlist[index];
			const fileName = file.name;
			const filePath = 'file://' + file.path.replaceAll('\\', '/');
			const fileType = file.type;
			const vidTracks = videoObj.getElementsByTagName('track');

			// remove old subtitle tracks
			for (const i of vidTracks)
				videoObj.removeChild(i);

			$scope.currPlayIdx = index;

			currFileType = fileType;
			currFilePath = filePath;
			currFileName = fileName;
			videoObj.src = filePath;

			console.log('vid tracks');
			console.log(vidTracks);

			setPlaybackStatus(true);
			updatePlaybackInfo();
			// spectrumAnalyser();
			$scope.togglePlayback(true);
		}

		function loadSubtitles() {
			const subsPath = currFilePath.split('/').slice(0, -1).join('/');
			const subsFile = currFileName.substring(0, currFileName.lastIndexOf('.')) + '.srt';

			(fetch(subsPath + '/' + subsFile)
				.then((response) => {
					response.text().then((data) => {
						const vttSubs = srt2vtt.convert(data);
						const subsURI = 'data:text/vtt;base64,' + btoa(unescape(encodeURIComponent(vttSubs)));
						const track = document.createElement('track');

						track.kind = 'subtitles';
						track.label = 'English';
						track.srclang = 'en';
						track.src = subsURI;
						track.addEventListener('load', function() {
							this.mode = 'showing';
						});

						videoObj.appendChild(track);
					});
				})
				.catch(() => {
					console.log('no subtitles found');
				})
			);
		}

		function formatTime(input) {
			const hour = Math.floor(input / 3600);
			const mins = Math.floor((input % 3600) / 60);
			const secs = Math.floor(input % 60);

			let output = '';
				output += String(hour || 0).padStart(2, '0');
				output += ':';
				output += String(mins || 0).padStart(2, '0');
				output += ':';
				output += String(secs || 0).padStart(2, '0');

			return output;
		}

		function updatePlaybackInfo() {
			$timeout(() => {
				const played = videoObj.currentTime;
				const total = videoObj.duration;

				$scope.playback.duration = total;
				$scope.playback.time = played;
				$scope.playback.timeTotal = formatTime(total);
				$scope.playback.timePlayed = formatTime(played);
			});

			updateTimer = setTimeout(updatePlaybackInfo, 500);
		}

		function setVolume(newVolume) {
			let volLvlImg = '';

			if (newVolume == 0.0)
				volLvlImg = 'off';
			else if (newVolume >= 0.7)
				volLvlImg = 'high';
			else if (newVolume >= 0.4)
				volLvlImg = 'medium';
			else if (newVolume < 0.4)
				volLvlImg = 'low';

			videoObj.volume = newVolume;

			$timeout(() => {
				$scope.currVolume = newVolume;
				$scope.volumeImg = 'volume-' + volLvlImg;
				$scope.volumePcnt = (newVolume * 100);
				$scope.volumeSlider.value = newVolume;
			});

			localStorage.setItem('volume', newVolume);
		}

		function showStatusIcon(icon, persist) {
			$scope.statusIcon = icon;

			if (!persist) {
				$timeout(() => {
					$scope.statusIcon = '';
				}, 1000);
			}
		}

		$scope.seekerChanged = () => {
			$scope.togglePlayback(false, true);
			clearTimeout(updateTimer);
			clearTimeout(seekerDelay);
			setPlaybackStatus(false);

			videoObj.currentTime = $scope.playback.time;

			seekerDelay = setTimeout(() => {
				$scope.togglePlayback(true, true);
				updatePlaybackInfo();
			}, 200);
		};

		$scope.openPlayPause = () => {
			if ($scope.playlist.length == 0)
				$scope.openFile();
			else
				$scope.togglePlayback();
		};

		$scope.openFile = (reset) => {
			if (reset) {
				$scope.playlist = [];

				$scope.stopPlayback();
			}

			document.getElementById('openFile').click();
		};

		$scope.appendFile = () => {
			appendPlaylist = true;

			$scope.openFile();
		};

		$scope.loadFiles = (files) => {
			console.log('openFiles');
			console.log(files);

			if (appendPlaylist)
				appendPlaylist = false;
			else
				$scope.playlist = [];

			addToPlaylist(files);

			// if (playOpenedFile)
				// playMedia($scope.playlist.length - 1);
		};

		$scope.togglePlayback = (play, seek) => {
			if (play || !$scope.playback.playing) {
				videoObj.play();

				$timeout(() => {
					if (currFileType.includes('audio/')) {
						if (!$scope.settings.audio_visualiser)
							showStatusIcon('music', true);
					}
					else {
						showStatusIcon('play');
					}

					setPlaybackStatus(true);
				});
			}
			else {
				videoObj.pause();

				$timeout(() => {
					showStatusIcon('pause', true);
					setPlaybackStatus(false);
				});
			}
		};

		$scope.stopPlayback = () => {
			videoObj.pause();
			videoObj.currentTime = 0;

			showStatusIcon('stop');
			updatePlaybackInfo();
			clearTimeout(updateTimer);
			setPlaybackStatus(false);

			$timeout(() => {
				$scope.playback.timePlayed = '00:00';
				$scope.playback.timeTotal = '00:00';
			});
		};

		$scope.nextTrack = () => {
			if ($scope.currPlayIdx < ($scope.playlist.length - 1)) {
				$scope.currPlayIdx++;

				$scope.stopPlayback();
				playMedia($scope.currPlayIdx);
			}
		};

		$scope.prevTrack = () => {
			if ($scope.currPlayIdx > 0) {
				$scope.currPlayIdx--;

				$scope.stopPlayback();
				playMedia($scope.currPlayIdx);
			}
		};

		$scope.videoSpeed = (action) => {
			const currSpeed = videoObj.playbackRate;

			if (currSpeed > 0) {
				switch (action) {
					case '+': {
						videoObj.playbackRate = parseFloat((currSpeed + 0.25).toFixed(2));
						break;
					}
					case '-': {
						videoObj.playbackRate = parseFloat((currSpeed - 0.25).toFixed(2));
						break;
					}
				}
			}
		};

		$scope.toggleMute = () => {
			if ($scope.currVolume > 0.0) {
				volBeforeMute = $scope.currVolume;

				setVolume(0.0);
			}
			else {
				setVolume(volBeforeMute);
			}
		};

		$scope.changeVolume = () => {
			setVolume($scope.volumeSlider.value);
		};

		$scope.toggleFullScreen = () => {
			fullScreen = !fullScreen;

			window.electronAPI.setFullScreen(fullScreen);
		};

		$scope.clearPlaylist = () => {
			$scope.playlist.length = 0;
		};

		$scope.$on('settingsChanged', (event, data) => {
			$scope.settings = data;
		});

		document.getElementById('volumeArea').addEventListener('mouseover', (event) => {
			$timeout.cancel(showVolumeTimer);

			$timeout(() => {
				$scope.showVolSlider = true;
			});
		});

		document.getElementById('volumeArea').addEventListener('mouseout', (event) => {
			showVolumeTimer = $timeout(() => {
				$scope.showVolSlider = false;
			}, 500);
		});

		document.getElementById('volumeArea').addEventListener('wheel', (event) => {
			let oldVolume = videoObj.volume;
			let newVolume = oldVolume;

			if (event.deltaY > 0) {
				if (oldVolume > 0.0)
					newVolume = parseFloat((oldVolume - 0.1).toFixed(1));
			}
			else {
				if (oldVolume < 1.0)
					newVolume = parseFloat((oldVolume + 0.1).toFixed(1));
			}

			if (newVolume != oldVolume)
				setVolume(newVolume);
		});

		document.addEventListener('drop', (event) => {
			event.preventDefault();
			event.stopPropagation();

			addToPlaylist(event.dataTransfer.files)
		});

		document.addEventListener('dragover', (event) => {
			event.preventDefault();
			event.stopPropagation();
		});
/*
		document.addEventListener('mousemove', (event) => {
			$timeout.cancel(showControlTimer);

			$timeout(() => {
				$scope.showControls = true;
			});

			showControlTimer = $timeout(() => {
				$scope.showControls = false;
			}, 5000);
		});

		document.addEventListener('mouseout', (event) => {
			showControlTimer = $timeout(() => {
				$scope.showControls = false;
			}, 1000);
		});
*/
		document.addEventListener('keyup', (event) => {
			console.log('key pressed', event.code);

			switch (event.code) {
				case 'Space': {
					$scope.togglePlayback();
					break;
				}
				case 'ArrowLeft': {
					// back 10s
					break;
				}
				case 'ArrowRight': {
					// fwrd 10s
					break;
				}
				case 'ArrowUp': {
					// vol up
					break;
				}
				case 'ArrowDown': {
					// vol down
					break;
				}
			}
		});

		document.getElementById('videoWrapper').addEventListener('click', (event) => {
			if ($scope.playlist.length > 0)
				$scope.togglePlayback();
		});

		document.getElementById('videoWrapper').addEventListener('dblclick', (event) => {
			$scope.toggleFullScreen();
		});

		videoObj.addEventListener('loadedmetadata', (event) => {
			const data = event.target;
			const vidWidth = data.videoWidth;
			const vidHeight = data.videoHeight;

			if ($scope.settings.resize_on_play)
				window.electronAPI.resizeWindow(vidWidth, vidHeight);

			if ($scope.settings.centre_on_play)
				window.electronAPI.centreWindow();

			loadSubtitles();
		});

		videoObj.addEventListener('ended', () => {
			if ($scope.settings.exit_on_finish)
				window.electronAPI.exitApp();
		});

		setVolume($scope.currVolume);
	})
);
