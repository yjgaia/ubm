#!/usr/bin/env node

require('uppercase-core');

RUN(function() {
	
	var
	// BOX_SITE_URL
	BOX_SITE_URL = 'http://box.uppercase.io',
	
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
	
	// root path
	rootPath = process.cwd()
	
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
						SHOW_ERROR('ubm', '존재하지 않는 유저입니다.', {
							username : username,
							boxName : boxName
						});
					}
				}
				
				else if (validErrors.boxName !== undefined) {
					if (validErrors.boxName.type === 'notExists') {
						SHOW_ERROR('ubm', '존재하지 않는 BOX입니다.', {
							username : username,
							boxName : boxName
						});
					}
				}
				
				else {
					SHOW_ERROR('ubm', '알 수 없는 오류가 발생했습니다.', {
						username : username,
						boxName : boxName
					});
				}
			}
			
			else if (result.boxData !== undefined) {
				
				boxData = result.boxData;
				
				NEXT([
				function(next) {
					
					READ_FILE({
						path : rootPath + '/BOX/' + boxName + '/VERSION',
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
									path : rootPath + '/BOX/' + boxName + '/DEPENDENCY',
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
							path : rootPath + '/BOX/' + boxName,
							isSync : true
						}, {
							notExists : function() {
								// ignore.
							}
						});
						
						DOWNLOAD({
							url : BOX_SITE_URL + '/__RF/BoxSite/' + boxData.fileId,
							path : rootPath + '/BOX/__' + boxName + '.zip'
						}, function() {
							
							READ_FILE(rootPath + '/BOX/__' + boxName + '.zip', function(content) {
								
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
												path : rootPath + '/BOX/' + boxName + fileInfo.path,
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
											
											REMOVE_FILE(rootPath + '/BOX/__' + boxName + '.zip');
											
											console.log(CONSOLE_BLUE('[' + boxName + '] BOX가 새로 설치되었습니다.'));
											
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
		.arguments('<cmd> [box]')
		.action(function(cmd, box) {
			
			var
			// username
			username,
			
			// box name
			boxName;
			
			if (box !== undefined && box.indexOf('/') !== -1) {
				username = box.substring(0, box.indexOf('/'));
				boxName = box.substring(box.indexOf('/') + 1);
			}
			
			// 설치하기
			if (cmd === 'install') {
				
				READ_FILE(rootPath + '/DEPENDENCY', {
					
					notExists : function() {
						SHOW_ERROR('ubm', 'DEPENDENCY 파일이 존재하지 않습니다.');
					},
					
					success : function(content) {
						installDependency(content, function() {
							console.log(CONSOLE_GREEN('모든 BOX를 설치하였습니다.'));
						});
					}
				});
			}
			
			// 패킹하기
			else if (cmd === 'pack' && box !== undefined) {
				
				boxName = box;
				
				RUN(function() {
					
					var
					//IMPORT: Path
					Path = require('path'),
					
					// common script
					commonScript = '',
				
					// browser script
					browserScript = '',
				
					// node script
					nodeScript = '',
				
					// copy folder.
					copyFolder = function(from, to) {
				
						FIND_FILE_NAMES({
							path : from,
							isSync : true
						}, function(fileNames) {
							EACH(fileNames, function(fileName) {
								COPY_FILE({
									from : from + '/' + fileName,
									to : to + '/' + fileName,
									isSync : true
								});
							});
						});
				
						FIND_FOLDER_NAMES({
							path : from,
							isSync : true
						}, function(folderNames) {
							EACH(folderNames, function(folderName) {
								copyFolder(from + '/' + folderName, to + '/' + folderName);
							});
						});
					},
				
					// scan box folder.
					scanBoxFolder = function(fileFunc, folderFunc) {
						//REQUIRED: fileFunc
						//REQUIRED: folderFunc
				
						FIND_FILE_NAMES({
							path : boxName,
							isSync : true
						}, function(fileNames) {
							EACH(fileNames, function(fileName) {
								fileFunc(boxName + '/' + fileName);
							});
						});
				
						FIND_FOLDER_NAMES({
							path : boxName,
							isSync : true
						}, function(folderNames) {
							EACH(folderNames, function(folderName) {
								if (folderName !== 'BROWSER' && folderName !== 'COMMON' && folderName !== 'NODE') {
									folderFunc(boxName + '/' + folderName);
								}
							});
						});
					},
				
					// load for common.
					loadForCommon = function(relativePath) {
						//REQUIRED: relativePath
				
						if (Path.extname(relativePath) === '.js') {
				
							// add to common script.
							commonScript += READ_FILE({
								path : rootPath + '/' + relativePath,
								isSync : true
							}) + '\n';
						}
					},
				
					// load for browser.
					loadForBrowser = function(relativePath) {
						//REQUIRED: relativePath
				
						if (Path.extname(relativePath) === '.js') {
				
							// add to browser script.
							browserScript += READ_FILE({
								path : rootPath + '/' + relativePath,
								isSync : true
							}) + '\n';
						}
					},
				
					// load for node.
					loadForNode = function(relativePath) {
						//REQUIRED: relativePath
				
						if (Path.extname(relativePath) === '.js') {
				
							// add to node script.
							nodeScript += READ_FILE({
								path : rootPath + '/' + relativePath,
								isSync : true
							}) + '\n';
						}
					};
				
					// pack box.
					console.log(CONSOLE_BLUE('[' + boxName + '] BOX를 패킹합니다.'));
				
					// for common scripts.
					console.log('공용 스크립트를 로딩합니다.');
					scanFolder(boxName + '/COMMON', '', loadForCommon);
					commonScript = MINIFY_JS(commonScript);
					
					if (commonScript !== '') {
						
						console.log('공용 스크립트를 저장합니다.');
				
						WRITE_FILE({
							path : '__PACK/' + boxName + '/COMMON.js',
							content : commonScript,
							isSync : true
						});
					}
					
					else {
						console.log(CONSOLE_YELLOW('공용 스크립트가 없습니다.'));
					}
					
					// for browser scripts.
					console.log('웹 브라우저 환경 스크립트를 로딩합니다.');
					scanFolder(boxName + '/BROWSER', '', loadForBrowser);
					browserScript = MINIFY_JS(browserScript);
					
					if (commonScript !== '' || browserScript !== '') {
						
						console.log('웹 브라우저 환경 스크립트를 저장합니다.');
				
						WRITE_FILE({
							path : '__PACK/' + boxName + '/BROWSER.js',
							content : commonScript + browserScript,
							isSync : true
						});
					}
					
					else {
						console.log(CONSOLE_YELLOW('웹 브라우저 환경 스크립트가 없습니다.'));
					}
					
					// for node sciprt.
					console.log('Node.js 환경 스크립트를 로딩합니다.');
					scanFolder(boxName + '/NODE', '', loadForNode);
					nodeScript = MINIFY_JS(nodeScript);
					
					if (commonScript !== '' || nodeScript !== '') {
						
						console.log('Node.js 환경 스크립트를 저장합니다.');
				
						WRITE_FILE({
							path : '__PACK/' + boxName + '/NODE.js',
							content : commonScript + nodeScript,
							isSync : true
						});
					}
					
					else {
						console.log(CONSOLE_YELLOW('Node.js 환경 스크립트가 없습니다.'));
					}
				
					// save node module.
					if (CHECK_FILE_EXISTS({
						path : boxName + '/NODE/node_modules',
						isSync : true
					}) === true) {
						console.log('Node.js 모듈을 저장합니다.');
						copyFolder(boxName + '/NODE/node_modules', '__PACK/' + boxName + '/node_modules');
					}
					
					console.log('기타 포함되어 있는 파일들을 저장합니다.');
					
					// copy all files.
					scanBoxFolder(function(path) {
						COPY_FILE({
							from : path,
							to : '__PACK/' + boxName + '/' + path.substring(boxName.length + 1),
							isSync : true
						});
					}, function(path) {
						copyFolder(path, '__PACK/' + boxName + '/' + path.substring(boxName.length + 1));
					});
					
					// copy readme file.
					COPY_FILE({
						from : 'README.md',
						to : '__PACK/' + boxName + '/README.md',
						isSync : true
					});
					
					// copy version file.
					COPY_FILE({
						from : 'VERSION',
						to : '__PACK/' + boxName + '/VERSION',
						isSync : true
					});
					
					// copy dependency file.
					COPY_FILE({
						from : 'DEPENDENCY',
						to : '__PACK/' + boxName + '/DEPENDENCY',
						isSync : true
					}, {
						notExists : function() {
							// ignore.
						}
					});
				
					// done!
					console.log(CONSOLE_GREEN('[' + boxName + '] BOX를 성공적으로 패킹하였습니다.'));
				});
			}
			
			// 출시하기
			else if (cmd === 'publish' && boxName !== undefined) {
				
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
						path : rootPath + '/__PACK/' + boxName + '/README.md',
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
						path : rootPath + '/__PACK/' + boxName + '/DEPENDENCY',
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
					
					READ_FILE(rootPath + '/__PACK/' + boxName + '/VERSION', {
						
						notExists : function() {
							SHOW_ERROR('ubm', 'VERSION 파일이 존재하지 않습니다.');
						},
						
						success : function(versionContent) {
							
							zip = JSZip();
							
							scanFolder(rootPath + '/__PACK/' + boxName, '', function(fromPath, toPath) {
								
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
				SHOW_ERROR('ubm', '알 수 없는 명령입니다.', cmd);
			}
		});
	
	program.parse(process.argv);
});
