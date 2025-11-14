import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function dbg(a: String) {
    console.log(`[DEBUG] ${a}`);
}

export default function Home() {
    const [test, setTest] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        dbg(`test: ${test}`)
    }, [test]);

    return (
        <div>
            <h1 className="text-2xl">Home</h1>
            <h3>{test}</h3>
            <button onClick={() => setTest((v) => ++v)} className="bg:black">Count</button>
            <button onClick={() => navigate("/login")}>Go to Login page</button>
        </div>
    );
}