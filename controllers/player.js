'use strict';

(angular
	.module(appName)
	.controller('PlayerCtrl', ($scope, $timeout) => {
		const savedVolume = localStorage.getItem('volume');
		const videoObj = document.getElementById('videoPlayer');
		const volumeArea = document.getElementById('volumeArea');
		const speedArea = document.getElementById('speedArea');
		const canvasEle = document.getElementById('visualiserCvs');
		const canvasCtx = canvasEle.getContext('2d');

		let ctrlKeyDown = false;
		let shiftKeyDown = false;
		let altKeyDown = false;
		let updateTimer = null;
		let seekerDelay = null;
		// let playOpenedFile = true;
		let volBeforeMute = 0.0;
		let showControlTimer = null;
		let showVolumeTimer = null;
		let showSpeedTimer = null;
		let showInfoTimer = null;
		let fullScreen = false;
		let currFileType = '';
		let currFilePath = '';
		let currFileName = '';
		let appendPlaylist = false;
		let currSubsData = [];

		// audio analyser
		let audioAnl = null;
		let analyserBufr = null;
		let analyserData = null;
		let analyserBarW = 0;
		let analyserBarH = 0;
		let analyserBarX = 0;
		let analyserW = 0;
		let analyserH = 0;
		let analyserLoaded = false;

		$scope.settings = {};
		$scope.showControls = true;
		$scope.currVolume = parseFloat(savedVolume) || 0.5;
		$scope.settingsOpen = false;
		$scope.appVersion = '0.0.1';
		$scope.volumeImg = '';
		$scope.volumePcnt = 0;
		$scope.volumeSlider = {'value': 0.0};
		$scope.speedSlider = {'value': 1.0};
		$scope.openFiles = '';
		$scope.currPlayIdx = 0;
		$scope.playlist = [];
		$scope.statusIcon = '';
		$scope.appStartup = true;
		$scope.showVolSlider = false;
		$scope.showSpeedSlider = false;
		$scope.errorMessage = '';
		$scope.infoMessage = '';
		$scope.currSubtitle = '';
		$scope.showSubtitles = false;

		$scope.playback = {
			'title': '',
			'playing': false,
			'time': 0.0,
			'duration': 0.0,
			'timePlayed': '00:00:00',
			'timeTotal': '00:00:00',
			'repeat': false,
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

			if (!file)
				return;

			const fileName = file.name;
			const filePath = 'file://' + file.path.replaceAll('\\', '/');
			const fileType = file.type;

			$scope.currPlayIdx = index;

			currFileType = fileType;
			currFilePath = filePath;
			currFileName = fileName;
			videoObj.src = filePath;

			setPlaybackStatus(true);
			updatePlaybackInfo();
			$scope.togglePlayback(true);
		}

		function spectrumAnalyser() {
			console.log('spectrumAnalyser');

			const audioCtx = new AudioContext();
			const vidStream = videoObj.captureStream();
			const audioSrc = audioCtx.createMediaStreamSource(vidStream);

			audioAnl = audioCtx.createAnalyser();
			audioAnl.fftSize = 128;

			audioAnl.connect(audioCtx.destination);
			audioSrc.connect(audioAnl);

			analyserBufr = audioAnl.frequencyBinCount;
			analyserData = new Uint8Array(analyserBufr);
			analyserBarW = (Math.floor(analyserW / analyserBufr) * 2) - 3;
			analyserLoaded = true;

			canvasCtx.clearRect(0, 0, analyserW, analyserH);
			requestAnimationFrame(analyserRender);
		}

		function analyserRender() {
			console.log('analyserRender');

			audioAnl.getByteFrequencyData(analyserData);

			analyserBarX = 1;
			canvasCtx.fillStyle = '#000';
			canvasCtx.fillRect(0, 0, analyserW, analyserH);

			for (let i = 0; i < analyserBufr; i++) {
				analyserBarH = analyserData[i];

				canvasCtx.fillStyle = '#fff';
				canvasCtx.fillRect(analyserBarX, analyserH - analyserBarH, analyserBarW, analyserBarH);

				analyserBarX += analyserBarW + 1;
			}

			if ($scope.playback.playing)
				requestAnimationFrame(analyserRender);
		}

		function getSubtitles() {
			const subsPath = currFilePath.split('/').slice(0, -1).join('/');
			const subsFile = currFileName.substring(0, currFileName.lastIndexOf('.'));

			currSubsData = [];

			getSubtitlesVTT(subsPath + '/' + subsFile);
		}

		// try to load vtt subtitles
		function getSubtitlesVTT(filePath) {
			(fetch(filePath + '.vtt')
				.then((response) => {
					response.text().then((data) => {
						loadSubtitles(data);
					});
				})
				.catch(() => {
					console.log('no vtt subtitles found, trying srt...');
					getSubtitlesSRT(filePath);
				})
			);
		}

		// try to load srt subtitles and convert to vtt
		function getSubtitlesSRT(filePath) {
			(fetch(filePath + '.srt')
				.then((response) => {
					response.text().then((data) => {
						const vttSubs = srt2vtt.convert(data);

						loadSubtitles(vttSubs);
					});
				})
				.catch(() => {
					console.log('no srt subtitles found');
				})
			);
		}

		function loadSubtitles(data) {
			const subsArr = data.split('\n\n');

			subsArr.shift();

			for (const i of subsArr) {
				if (!i)
					continue;

				const sub = i.split('\n');
				const subTimes = sub[1].split(' --> ');
				const subTime1 = convertTime(subTimes[0]);
				const subTime2 = convertTime(subTimes[1]);
				const subRows = sub.slice(2);

				let subText = '';

				for (const j of subRows)
					subText += '<div>' + j + '</div><br>';

				currSubsData.push({
					'start': subTime1,
					'end': subTime2,
					'text': subText,
				});
			}

			if ($scope.settings.auto_show_subs)
				$scope.toggleSubtitles(true);
		}

		function updateSubtitles(time) {
			for (const i of currSubsData) {
				if (time >= i.start && time < i.end) {
					$scope.currSubtitle = i.text;
					break;
				}
				else {
					$scope.currSubtitle = '';
				}
			}
		}

		function formatTime(input, millis) {
			const hour = Math.floor(input / 3600);
			const mins = Math.floor((input % 3600) / 60);
			const secs = Math.floor(input % 60);
			const mils = parseInt(input.toFixed(3).split('.')[1]);

			let output = '';

			output += String(hour || 0).padStart(2, '0');
			output += ':';
			output += String(mins || 0).padStart(2, '0');
			output += ':';
			output += String(secs || 0).padStart(2, '0');

			if (millis)
				output += '.' + String(mils).padStart(3, '0');

			return output;
		}

		function convertTime(input) {
			const time = input.split(':');
			const mils = parseInt(input.split('.')[1]);

			let output = 0.0;

			output += parseInt(time[0]) * 3600;
			output += parseInt(time[1]) * 60;
			output += parseInt(time[2]);
			output += parseFloat('0.' + mils);

			return output;
		}

		function updatePlaybackInfo(force) {
			if ($scope.playback.playing || force) {
				$timeout(() => {
					const played = videoObj.currentTime;
					const total = videoObj.duration;

					$scope.playback.duration = total;
					$scope.playback.time = played;
					$scope.playback.timeTotal = formatTime(total);
					$scope.playback.timePlayed = formatTime(played);

					updateSubtitles(played);
				});
			}

			updateTimer = setTimeout(updatePlaybackInfo, 200);
		}

		function showInfoMessage(infoMsg) {
			$timeout.cancel(showInfoTimer);

			$scope.infoMessage = infoMsg;

			showInfoTimer = $timeout(() => {
				$scope.infoMessage = '';
			}, 500);
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

				showInfoMessage($scope.$parent.langStrings.volume + ': ' + $scope.volumePcnt + '%');
			});

			localStorage.setItem('volume', newVolume);
		}

		function incrementVolume(action) {
			let oldVolume = videoObj.volume;
			let newVolume = oldVolume;

			switch (action) {
				case '-': {
					if (oldVolume > 0.0)
						newVolume = parseFloat((oldVolume - 0.1).toFixed(1));

					break;
				}
				case '+': {
					if (oldVolume < 1.0)
						newVolume = parseFloat((oldVolume + 0.1).toFixed(1));

					break;
				}
			}

			if (newVolume != oldVolume)
				setVolume(newVolume);
		}

		function setSpeed(newSpeed) {
			videoObj.playbackRate = newSpeed;

			$timeout(() => {
				$scope.speedSlider.value = newSpeed;

				showInfoMessage($scope.$parent.langStrings.play_speed + ': ' + newSpeed.toFixed(2));
			});
		}

		function incrementSpeed(action) {
			let oldSpeed = videoObj.playbackRate;
			let newSpeed = oldSpeed;

			switch (action) {
				case '-': {
					if (oldSpeed > 0.1)
						newSpeed = parseFloat((oldSpeed - 0.1).toFixed(2));

					break;
				}
				case '+': {
					if (oldSpeed < 4.0)
						newSpeed = parseFloat((oldSpeed + 0.1).toFixed(2));

					break;
				}
			}

			if (newSpeed != oldSpeed)
				setSpeed(newSpeed);
		}

		function showStatusIcon(icon, persist) {
			$scope.statusIcon = icon;

			if (!persist) {
				$timeout(() => {
					$scope.statusIcon = '';
				}, 1000);
			}
		}

		function setVideoTime(amount) {
			videoObj.currentTime = (videoObj.currentTime + amount);

			updatePlaybackInfo(true);
			showInfoMessage('Jump ' + ((amount > 0) ? '+' : '') + amount + 's');
		}

		$scope.jumpVideoTime = (action) => {
			switch (action) {
				case 'B': { setVideoTime(-1 * $scope.settings.jump_time_amount); break; }
				case 'F': { setVideoTime($scope.settings.jump_time_amount); break; }
			}
		};

		$scope.seekerChanged = () => {
			// $scope.togglePlayback(false, true);
			clearTimeout(updateTimer);
			clearTimeout(seekerDelay);
			// setPlaybackStatus(false);

			videoObj.currentTime = $scope.playback.time;

			seekerDelay = setTimeout(() => {
				// $scope.togglePlayback(true, true);
				updatePlaybackInfo();
			}, 200);
		};

		$scope.volumeChanged = () => {
			setVolume($scope.volumeSlider.value);
		};

		$scope.speedChanged = () => {
			setSpeed($scope.speedSlider.value);
		};

		$scope.normalSpeed = () => {
			setSpeed(1.0);
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
				$scope.errorMessage = '';

				(videoObj.play()
					.then(() => {
						$timeout(() => {
							if (currFileType.includes('audio/')) {
								if ($scope.settings.audio_visualiser) {
									if (analyserLoaded)
										requestAnimationFrame(analyserRender);
								}
								else {
									showStatusIcon('music', true);
								}
							}
							else {
								showStatusIcon('play');
							}

							setPlaybackStatus(true);
						});
					})
					.catch((e) => {
						let errStr = e.toString();
						let errMsg = $scope.$parent.langStrings.error_noplay;

						if (errStr.includes('no supported source'))
							errMsg += $scope.$parent.langStrings.error_format;
						else
							errMsg += $scope.$parent.langStrings.error_unknown;

						$scope.errorMessage = errMsg;
					})
				);
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
			// analyserLoaded = false;

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
				showInfoMessage('Next video');
			}
			else {
				showInfoMessage('No more videos');
			}
		};

		$scope.prevTrack = () => {
			if ($scope.currPlayIdx > 0) {
				$scope.currPlayIdx--;

				$scope.stopPlayback();
				playMedia($scope.currPlayIdx);
				showInfoMessage('Previous video');
			}
			else {
				showInfoMessage('No more videos');
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

		$scope.toggleFullScreen = (value) => {
			if (typeof value == 'boolean')
				fullScreen = value;
			else
				fullScreen = !fullScreen;

			window.electronAPI.setFullScreen(fullScreen);
		};

		$scope.clearPlaylist = () => {
			$scope.playlist.length = 0;
		};

		$scope.repeatVideo = () => {
			const loopVideo = !$scope.playback.repeat;

			$scope.playback.repeat = loopVideo;

			videoObj.loop = loopVideo;
		};

		$scope.toggleSubtitles = (value) => {
			if (typeof value == 'boolean')
				$scope.showSubtitles = value;
			else
				$scope.showSubtitles = !$scope.showSubtitles;
		};

		$scope.showInfo = () => {
			console.log('show info');
		};

		$scope.$on('settingsChanged', (event, data) => {
			$scope.settings = data;
		});

		volumeArea.addEventListener('mouseover', () => {
			$timeout.cancel(showVolumeTimer);

			$timeout(() => {
				$scope.showVolSlider = true;
			});
		});

		volumeArea.addEventListener('mouseout', () => {
			showVolumeTimer = $timeout(() => {
				$scope.showVolSlider = false;
			}, 500);
		});

		volumeArea.addEventListener('wheel', (event) => {
			if (event.deltaY > 0)
				incrementVolume('-');
			else
				incrementVolume('+');
		});

		speedArea.addEventListener('mouseover', () => {
			$timeout.cancel(showSpeedTimer);

			$timeout(() => {
				$scope.showSpeedSlider = true;
			});
		});

		speedArea.addEventListener('mouseout', () => {
			showSpeedTimer = $timeout(() => {
				$scope.showSpeedSlider = false;
			}, 500);
		});

		speedArea.addEventListener('wheel', (event) => {
			if (event.deltaY > 0)
				incrementSpeed('-');
			else
				incrementSpeed('+');
		});

		document.getElementById('videoWrapper').addEventListener('click', () => {
			if ($scope.playlist.length > 0)
				$scope.togglePlayback();
		});

		document.getElementById('videoWrapper').addEventListener('dblclick', () => {
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

			if (currFileType.includes('audio/')) {
				if ($scope.settings.audio_visualiser) {
					if ($scope.settings.resize_on_play) {
						analyserW = vidWidth;
						analyserH = vidHeight;
					}
					else {
						analyserW = document.body.clientWidth;
						analyserH = document.body.clientHeight;
						// todo: resize analyser if window is resized
					}

					videoObj.style.display = 'none';
					canvasEle.style.display = 'block';
					canvasEle.width = analyserW;
					canvasEle.height = analyserH;

					// if (!analyserLoaded)
						spectrumAnalyser();
				}
			}
			else {
				canvasEle.style.display = 'none';
				videoObj.style.display = 'block';

				getSubtitles();
			}
		});

		videoObj.addEventListener('ended', () => {
			if ($scope.settings.exit_on_finish)
				window.electronAPI.exitApp();
		});

		videoObj.addEventListener('wheel', (event) => {
			if (event.deltaY > 0)
				incrementVolume('-');
			else
				incrementVolume('+');
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

		document.addEventListener('click', () => {
			$timeout.cancel(showControlTimer);

			$timeout(() => {
				$scope.showControls = true;
			});
		});

		document.addEventListener('mousemove', () => {
			$timeout.cancel(showControlTimer);

			$timeout(() => {
				$scope.showControls = true;
			});

			if (!$scope.settings.controls_visible) {
				showControlTimer = $timeout(() => {
					$scope.showControls = false;
				}, 3000);
			}
		});
/*
		document.addEventListener('mouseout', () => {
			$timeout.cancel(showControlTimer);

			showControlTimer = $timeout(() => {
				$scope.showControls = false;
			}, 500);
		});
*/
		document.addEventListener('keydown', (event) => {
			console.log('key down', event.code);

			switch (event.code) {
				case 'ControlLeft': case 'ControlRight': {
					ctrlKeyDown = true;
					break;
				}
				case 'ShiftLeft': case 'ShiftRight': {
					shiftKeyDown = true;
					break;
				}
				case 'AltLeft': case 'AltRight': {
					altKeyDown = true;
					break;
				}
			}
		});

		document.addEventListener('keyup', (event) => {
			console.log('key up', event.code);

			switch (event.code) {
				case 'ControlLeft': case 'ControlRight': {
					ctrlKeyDown = false;
					break;
				}
				case 'ShiftLeft': case 'ShiftRight': {
					shiftKeyDown = false;
					break;
				}
				case 'AltLeft': case 'AltRight': {
					altKeyDown = false;
					break;
				}
				case 'Space': {
					$scope.togglePlayback();
					break;
				}
				case 'ArrowLeft': {
					$scope.jumpVideoTime('B');
					break;
				}
				case 'ArrowRight': {
					$scope.jumpVideoTime('F');
					break;
				}
				case 'ArrowUp': {
					incrementVolume('+');
					break;
				}
				case 'ArrowDown': {
					incrementVolume('-');
					break;
				}
				case 'KeyM': {
					$scope.toggleMute();
					break;
				}
				case 'KeyO': {
					if (ctrlKeyDown) {
						ctrlKeyDown = false;

						$scope.appendFile();
					}

					break;
				}
				case 'KeyF': case 'F11': {
					$scope.toggleFullScreen();
					break;
				}
				case 'BracketLeft': case 'NumpadSubtract': {
					incrementSpeed('-');
					break;
				}
				case 'BracketRight': case 'NumpadAdd': {
					incrementSpeed('+');
					break;
				}
				case 'Equal': {
					setSpeed(1.0);
					break;
				}
				case 'Escape': {
					$scope.toggleFullScreen(false);
					break;
				}
			}
		});

		window.addEventListener('resize', (event) => {
			const win = event.target;

			analyserW = win.innerWidth;
			analyserH = win.innerHeight;
			canvasEle.width = analyserW;
			canvasEle.height = analyserH;
		});

		console.log('window');
		console.log(window);

		setVolume($scope.currVolume);
	})
);
