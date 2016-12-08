#!/usr/bin/env node

require('uppercase-core');

RUN(function() {
	
	var
	//IMPORT: co
	co = require('co'),
	
	//IMPORT: co-prompt
	prompt = require('co-prompt'),
	
	//IMPORT: commander
	program = require('commander');
	
	program
		.version('0.0.1')
		.arguments('<cmd> <box>')
		.action(function(cmd, box) {
			
			// 설치하기
			if (cmd === 'install') {
				
			}
			
			// 업데이트
			else if (cmd === 'update') {
				
			}
			
			// 삭제하기
			else if (cmd === 'remove') {
				
			}
			
			// 출시하기
			else if (cmd === 'publish') {
				
				co(function *() {
					
					var
					// password
					password = yield prompt.password('password: ');
				});
			}
			
			else {
				SHOW_ERROR('ubm', '알 수 없는 명령');
			}
		});
	
	program.parse(process.argv);
});
