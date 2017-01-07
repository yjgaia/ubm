#!/usr/bin/env node

require('uppercase-core');

RUN(function() {
	
	var
	// BOX_SITE_URL
	BOX_SITE_URL = 'http://localhost:8124',
	
	//IMPORT: co
	co = require('co'),
	
	//IMPORT: co-prompt
	prompt = require('co-prompt'),
	
	//IMPORT: commander
	program = require('commander'),
	
	//IMPORT: JSZip
	JSZip = require('jszip'),
	
	//IMPORT: request
	request = require('request'),
	
	// is publish mode
	isPublishMode = false;
	
	// check is allowed folder name.
	checkIsAllowedFolderName = function(name) {
		//REQUIRED: name

		return (
			// hide folder
			name[0] !== '.' &&

			// node.js module
			name !== 'node_modules' &&

			// not_load
			name !== 'not_load' &&

			// deprecated
			name !== 'deprecated' &&

			// _ folder
			name[0] !== '_'
		);
	},
	
	// scan folder.
	scanFolder = function(path, folderPath, func) {
		//REQUIRED: path
		//REQUIRED: folderPath
		//REQUIRED: func

		if (CHECK_FILE_EXISTS({
			path : path,
			isSync : true
		}) === true) {

			FIND_FILE_NAMES({
				path : path,
				isSync : true
			}, {

				error : function() {
					// ignore.
				},

				success : function(fileNames) {
					EACH(fileNames, function(fileName) {
						func(path + '/' + fileName, folderPath + '/' + fileName);
					});
				}
			});

			FIND_FOLDER_NAMES({
				path : path,
				isSync : true
			}, {

				error : function() {
					// ignore.
				},

				success : function(folderNames) {
					EACH(folderNames, function(folderName) {
						if (checkIsAllowedFolderName(folderName) === true) {
							scanFolder(path + '/' + folderName, folderPath + '/' + folderName, func);
						}
					});
				}
			});
		}
	},
	
	// install dependency.
	installDependency = function(content, callback) {
		
		NEXT(content.toString().split('\n'), [
		function(box, next) {
			
			box = box.trim();
			
			if (box !== '' && box.indexOf('/') !== -1) {
				installBox(box.substring(0, box.indexOf('/')), box.substring(box.indexOf('/') + 1), next);
			} else {
				next();
			}
		},
		
		function() {
			return callback;
		}]);
	},
	
	// install box.
	installBox = function(username, boxName, callback) {
		
		GET({
			url : BOX_SITE_URL + '/_/info',
			data : {
				username : username,
				boxName : boxName
			}
		}, function(result) {
			
			var
			// valid errors
			validErrors,
			
			// box data
			boxData;
			
			result = PARSE_STR(result);
			
			if (result.validErrors !== undefined) {
				
				validErrors = result.validErrors;
				
				if (validErrors.username !== undefined) {
					if (validErrors.username.type === 'notExists') {
						SHOW_ERROR('ubm', '존재하지 않는 유저입니다.');
					}
				}
				
				else if (validErrors.boxName !== undefined) {
					if (validErrors.boxName.type === 'notExists') {
						SHOW_ERROR('ubm', '존재하지 않는 BOX입니다.');
					}
				}
				
				else {
					SHOW_ERROR('ubm', '알 수 없는 오류가 발생했습니다.');
				}
			}
			
			else if (result.boxData !== undefined) {
				
				boxData = result.boxData;
				
				NEXT([
				function(next) {
					
					READ_FILE({
						path : process.cwd() + '/BOX/' + boxName + '/VERSION',
						isSync : true
					}, {
						
						notExists : function() {
							next();
						},
						
						success : function(versionContent) {
							
							if (boxData.version !== versionContent.toString()) {
								next();
							}
							
							else {
								
								READ_FILE({
									path : process.cwd() + '/BOX/' + boxName + '/DEPENDENCY',
									isSync : true
								}, {
									
									notExists : function() {
										callback();
									},
									
									success : function(content) {
										installDependency(content, callback);
									}
								});
							}
						}
					});
				},
				
				function() {
					return function() {
						
						REMOVE_FOLDER({
							path : process.cwd() + '/BOX/' + boxName,
							isSync : true
						}, {
							notExists : function() {
								// ignore.
							}
						});
						
						DOWNLOAD({
							url : BOX_SITE_URL + '/__RF/BoxSite/' + boxData.fileId,
							path : process.cwd() + '/BOX/__' + boxName + '.zip'
						}, function() {
							
							READ_FILE(process.cwd() + '/BOX/__' + boxName + '.zip', function(content) {
								
								JSZip.loadAsync(content).then(function(zip) {
									
									var
									// file infos
									fileInfos = [];
									
									zip.forEach(function(path, file) {
										if (path[path.length - 1] !== '/') {
											fileInfos.push({
												path : path,
												file : file
											});
										}
									});
									
									NEXT(fileInfos, [
									function(fileInfo, next) {
										
										fileInfo.file.async('nodebuffer').then(function(content) {
											
											WRITE_FILE({
												path : process.cwd() + '/BOX/' + boxName + fileInfo.path,
												content : content,
												isSync : true
											});
											
											if (fileInfo.path === '/DEPENDENCY') {
												installDependency(content, next);
											}
											
											else {
												next();
											}
										});
									},
									
									function() {
										return function() {
											
											REMOVE_FILE(process.cwd() + '/BOX/__' + boxName + '.zip');
											
											console.log(CONSOLE_GREEN('[' + boxName + '] 박스가 새로 설치되었습니다.'));
											
											callback();
										};
									}]);
								}); 
							});
						});
					};
				}]);
			}
		});
	};
	
	program
	.version('0.0.1')
	.arguments('<box>')
	.action(function(box) {
		
		var
		// username
		username,
		
		// box name
		boxName;
		
		isPublishMode = true;
		
		if (box.indexOf('/') !== -1) {
			
			username = box.substring(0, box.indexOf('/'));
			boxName = box.substring(box.indexOf('/') + 1);
			
			co(function *() {
				
				var
				// password
				password = yield prompt.password('비밀번호: '),
				
				// version
				version,
				
				// readme
				readme,
				
				// dependency
				dependency,
				
				// zip
				zip,
				
				// req
				req;
				
				readme = READ_FILE({
					path : process.cwd() + '/__PACK/' + boxName + '/README.md',
					isSync : true
				}, {
					notExists : function() {
						// ignore.
					}
				});
				
				if (readme !== undefined) {
					readme = readme.toString();
				}
				
				dependency = READ_FILE({
					path : process.cwd() + '/__PACK/' + boxName + '/DEPENDENCY',
					isSync : true
				}, {
					notExists : function() {
						// ignore.
					}
				});
				
				if (dependency !== undefined) {
					dependency = dependency.toString();
					dependency = dependency.split('\n');
				}
				
				READ_FILE(process.cwd() + '/__PACK/' + boxName + '/VERSION', {
					
					notExists : function() {
						SHOW_ERROR('ubm', 'VERSION 파일이 존재하지 않습니다.');
					},
					
					success : function(versionContent) {
						
						zip = JSZip();
						
						scanFolder(process.cwd() + '/__PACK/' + boxName, '', function(fromPath, toPath) {
							
							zip.file(toPath, READ_FILE({
								path : fromPath,
								isSync : true
							}));
						});
						
						zip.generateAsync({
							type : 'nodebuffer'
						}).then(function(content) {
							
							req = request.post(BOX_SITE_URL + '/__UPLOAD?boxName=BoxSite', function(err, res, result) {
								if (err !== TO_DELETE) {
									SHOW_ERROR('ubm', '저장소에 접속할 수 없습니다.', err);
								} else {
									
									POST({
										url : BOX_SITE_URL + '/_/publish',
										data : {
											username : username,
											password : password,
											
											boxName : boxName,
											fileId : JSON.parse(result)[0].id,
											version : versionContent.toString(),
											readme : readme,
											dependency : dependency
										}
									}, function(result) {
										
										var
										// valid errors
										validErrors;
										
										result = PARSE_STR(result);
										
										if (result === undefined) {
											
											console.log(CONSOLE_GREEN('성공적으로 출시되었습니다.'));
											
										} else {
											
											validErrors = result.validErrors;
											
											if (validErrors.password !== undefined) {
												if (validErrors.password.type === 'wrong') {
													SHOW_ERROR('ubm', '아이디와 비밀번호를 확인해주시기 바랍니다.');
												}
											}
											
											else if (validErrors.version !== undefined) {
												if (validErrors.version.type === 'existed') {
													SHOW_ERROR('ubm', '이미 존재하는 버전입니다.');
												}
											}
											
											else if (validErrors.dependency !== undefined) {
												SHOW_ERROR('ubm', 'DEPENDENCY 파일을 확인해주시기 바랍니다.');
											}
											
											else if (validErrors.readme !== undefined) {
												if (validErrors.version.type === 'size') {
													SHOW_ERROR('ubm', 'README 파일이 너무 깁니다.');
												}
											}
											
											else {
												SHOW_ERROR('ubm', '알 수 없는 오류가 발생했습니다.');
											}
										}
									});
								}
							});
							
							req.form().append('file', content, {
								filename : 'project.zip',
								contentType : 'application/zip'
							});
						});
					}
				});
			});
		}
		
		else {
			SHOW_ERROR('ubm', '알 수 없는 명령입니다.');
		}
	});
	
	program.parse(process.argv);
	
	if (isPublishMode !== true) {
		
		// 설치하기
		READ_FILE(process.cwd() + '/DEPENDENCY', {
			
			notExists : function() {
				SHOW_ERROR('ubm', 'DEPENDENCY 파일이 존재하지 않습니다.');
			},
			
			success : function(content) {
				installDependency(content, function() {
					console.log(CONSOLE_GREEN('완료'));
				});
			}
		});
	}
});
