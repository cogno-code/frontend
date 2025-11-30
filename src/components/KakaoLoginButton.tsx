const KAKAO_AUTH_URL = import.meta.env.DEV
  ? "http://localhost:8080/oauth2/authorization/kakao"
  : "/oauth2/authorization/kakao";

export default function KakaoLoginButton() {
  const handleClick = () => {
    window.location.href = KAKAO_AUTH_URL;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-md"
    >
      <img
        src="/icons/kakao_login/ko/kakao_login_large_narrow.png"
        alt="카카오 로그인"
        className="h-12 w-auto"
      />
    </button>
  );
}
