# ubm
UPPERCASE BOX를 관리하는 모듈입니다.

## ubm 설치
```
npm install -g ubm
```

## BOX 설치 및 업데이트
현재 폴더의 `DEPENDENCY` 파일에 수록되어 있는 모든 BOX들을 설치하거나 업데이트합니다.
```
ubm install
```

## BOX 패킹
현재 개발중인 BOX를 패킹하여 압축합니다.
```
ubm pack UUI
```

## API 문서 생성
BOX의 API 문서를 생성합니다.
```
ubm api UUI
```

## BOX 출시
현재 [BOX를 저장소](http://box.uppercase.io)에 출시합니다. 출시하기 전에 패킹을 수행하여야 합니다.
```
ubm publish Hanul/UUI
비밀번호: 
```

## 프로젝트 폴더 초기화
[프로젝트 구조](https://github.com/Hanul/UPPERCASE/blob/master/DOC/GUIDE/CREATE_PROJECT.md)에 따라 프로젝트 폴더를 초기화합니다.
```
ubm init UUI
```