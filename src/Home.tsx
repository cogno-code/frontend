import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./components/Header";

function dbg(a: String) {
    console.log(`[DEBUG] ${a}`);
}

export default function Home() {
    const [test, setTest] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        dbg(`test: ${test}`)
    }, [test]);

    useEffect(() => {
        const data = fetch("http://localhost:8080/test"); // CORS 문제 해결
        console.log(data);
    }, []);

    return (
        <div>
            <Header/>
            <h1 className="text-2xl">Header</h1>
            <h3>{test}</h3>
            <button onClick={() => setTest((v) => ++v)} className="bg:black">Count</button>
            <button onClick={() => navigate("/login")}>Go to Login page</button>
            <footer>Copyright 2025</footer>
        </div>
    );
}