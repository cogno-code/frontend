import { Link, useNavigate } from "react-router-dom";

export default function Login() {

    const navigate = useNavigate();

    // 251113 Goal: 아이디 비밀번호 회원가입창
    // tailwindcss 설치하기
    // 아이디 비번 관련 태그들 묶는 법이 있었을 텐데
    // type에 id는 없었음
    return (
        <div>
            <h1>Login</h1>
            <input placeholder="username"/>
            <input type="password" placeholder="password"></input>
            <button onClick={() => navigate("/")}>Login</button>
            <Link to="/signup">Sign up to website</Link>
        </div>
    );
}