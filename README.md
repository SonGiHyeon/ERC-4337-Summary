## ERC-4337 흐름도

https://blog.naver.com/tyumr70/223855936101

EOA 사용자는 직접 SimpleAccount에 트랜잭션을 보내지 않는다.
대신, 서명된 UserOperation 객체만 만들어 놓습니다. (서명 = “이 작업을 실행해줘”)

이 UserOperation은 실제로는 Bundler라는 EOA가 EntryPoint에 트랜잭션을 보내면서 첨부됩니다.
즉, 진짜 트랜잭션은 항상 EOA(=Bundler)가 발생시킵니다.

EntryPoint는 이 UserOperation을 받아서,

이게 유효한 요청인지 검증 (validateUserOp)

서명이 맞다면, 해당 스마트 계정(SimpleAccount)의 execute()를 내부 호출합니다.

결국 스마트 컨트랙트(SimpleAccount)가 마치 직접 실행한 것처럼 동작하지만,
실제로는 EntryPoint가 “대리 실행”해준 겁니다.

장점: 기존 EOA는 msg.sender = 개인키 1개 → 아주 제한적인 기능

ERC-4337로 스마트 컨트랙트가 계정이 되면, 지갑이 이렇게 진화합니다:

<img width="604" alt="image" src="https://github.com/user-attachments/assets/632be051-2352-4328-936e-566a0bf5ff06" />


------------------------------------------------------------------------------------------

User signs → UserOperation → Bundler → EntryPoint.handleOps() →
→ validateUserOp → SimpleAccount.validateUserOp() →
→ SimpleAccount.execute(...) → 대상 컨트랙트 실행

이제 ERC-4337의 핵심 흐름인 UserOperation → EntryPoint → SimpleAccount 경로가 정상적으로 작동

✅ 지금 구현된 테스트의 핵심 구조 요약
1. SimpleAccount
owner의 서명으로만 동작할 수 있는 Account Abstraction 계정

EntryPoint를 통해서만 execute() 가능 (require(msg.sender == EntryPoint))

2. EntryPoint
UserOperation[]을 받아서 검증(validateUserOp) → 실행(execute)

UserOperation.callData는 SimpleAccount.execute(receiver, value, data)의 인코딩된 파라미터

3. Test 흐름
deployer가 SimpleAccount에 ETH 전송

owner가 서명한 UserOperation을 만들어서 EntryPoint에 전달

EntryPoint는 해당 UserOperation을 검증 → SimpleAccount의 execute 호출 → receiver에게 ETH 전송


------------------------------------------------------------------------------------------


🧠 ERC-4337 개요
계정 추상화를 통해 스마트 컨트랙트를 지갑처럼 사용

EOA → Smart Account 전환

주요 구성요소: EntryPoint, UserOperation, Paymaster, Bundler

⚙️ 구현 구조
SimpleAccount: 서명 기반 실행, validateUserOp() + execute()

EntryPoint: UserOp 검증 및 실행의 중앙 허브

SimplePaymaster: 수수료 대납자 역할

🧪 테스트 시나리오

단일 UserOp 실행
→ account1이 0.01 ETH 전송 (Paymaster 사용)

Bundler 처리 (2개 UserOp)
→ account1, account2가 0.01 + 0.02 ETH 전송

Paymaster 없이 실행
→ account1이 가스 자가 부담
