import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// 디버그 함수
// ts니까 :String 이런식으로 명확히 지정
function dbg(a: String) {
    console.log(`[DEBUG] ${a}`);
}

export default function Home() {
    // useState test
    const [test, setTest] = useState(0);

    //useNavigate
    const navigate = useNavigate();

    // useEffect test
    // 얘도 익명함수? 넘겨야 하네
    useEffect(() => {
        dbg(`test: ${test}`)
    }, [test]);




    // 251112 Goal: /login 리다이렉트, count 이슈 수정
    return (
        <div>
            <h1>Home</h1>
            <h3>{test}</h3>
            <button onClick={() => setTest((v) => ++v)}>Count</button>
            <button onClick={() => navigate("/login")}>Go to Login page</button>
        </div>
    );
}