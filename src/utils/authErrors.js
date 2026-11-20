// 수파베이스 로그인·가입 오류를 화면에 보여 줄 한국어 문장으로 바꾼다.
// 수파베이스는 오류마다 code(예: 'invalid_credentials')를 붙여 준다. 예전 버전은 code 없이 영어 message만 주기도 해서 둘 다 본다.
const MESSAGES = {
  invalid_credentials: '이메일이나 비밀번호가 맞지 않아요.',
  email_not_confirmed: '아직 이메일 확인을 하지 않았어요. 받은 편지함에서 확인 메일의 링크를 눌러 주세요.',
  user_already_exists: '이미 가입한 이메일이에요. 로그인해 주세요.',
  email_exists: '이미 가입한 이메일이에요. 로그인해 주세요.',
  weak_password: '비밀번호가 너무 짧거나 쉬워요. 6자 이상으로 정해 주세요.',
  email_address_invalid: '이메일 주소 모양이 맞지 않아요.',
  validation_failed: '이메일과 비밀번호를 다시 확인해 주세요.',
  over_email_send_rate_limit: '메일을 너무 자주 보냈어요. 잠시 뒤에 다시 해 주세요.',
  over_request_rate_limit: '요청이 너무 많아요. 잠시 뒤에 다시 해 주세요.',
  signup_disabled: '지금은 새로 가입할 수 없어요.',
};

const BY_MESSAGE = [
  [/invalid login credentials/i, 'invalid_credentials'],
  [/email not confirmed/i, 'email_not_confirmed'],
  [/already registered/i, 'user_already_exists'],
  [/password should be/i, 'weak_password'],
  [/rate limit/i, 'over_request_rate_limit'],
];

export function authErrorMessage(error) {
  if (!error) return '';
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  const matched = BY_MESSAGE.find(([pattern]) => pattern.test(error.message || ''));
  if (matched) return MESSAGES[matched[1]];
  // 인터넷이 끊겼거나 수파베이스에 닿지 못했을 때 (fetch 실패)
  if (/fetch|network/i.test(error.message || '')) return '수파베이스에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
  return '로그인 중에 문제가 생겼어요. 잠시 뒤에 다시 해 주세요.';
}
