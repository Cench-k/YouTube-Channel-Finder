1. 구글 로그인 > 파이어베이스 검색 > 상단 우측 콘솔로 이동 > 시작하기 클릭 > 프로젝트이름 작성, 동의 > 계속버튼 > 애널리틱스 동의 > 프로젝트 만들기 > 대기 > 앱 추가 > </> 클릭 > 닉네임 등록 > const firebaseConfig = { ... }; 전부 복사 > 붙여넣기

2. 파이어베이스 > 보안 > Authentication 클릭 > 로그인 방법 클릭 > google 클릭 > 사용설정 활성화 > 프로젝트지원 이메일 작성 > 저장

3. 데이터베이스 및 스토리지 > Firestore 클릭 > 데이터베이스 만들기 클릭 > Standard 버전 > 위치 [asia-northeast3 (seoul) ] > 프로덕션 모드 > 만들기 > 상단 규칙 클릭 > 아래 코드 복사 후 붙여넣기 > 개발 및 테스트 클릭

<p>rules_version = '2';</p>
<p style="padding-left:5px;">service cloud.firestore {</p>
<p style="padding-left:10px;">match /databases/{database}/documents {</p>
<p style="padding-left:15px;">match /artifacts/{appId}/users/{userId}/{allPaths=**} {</p>
<p style="padding-left:20px;">allow read, write: if request.auth != null;</p>
<p style="padding-left:15px;">}</p>
<p style="padding-left:10px;">}</p>
<p style="padding-left:5px;">}</p>


4. 유튜브 api 키 발급 - https://console.cloud.google.com/apis/library/browse?q=youtube%20data%20api%20v3

안내 영상
https://youtu.be/Ee97X1RFptk
