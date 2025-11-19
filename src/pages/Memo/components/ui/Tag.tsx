import { useState } from "react";

export default function Tag() {
    const [array, setArray] = useState<String>();

    return (
    <div className="flex justify-start gap-2">
        <button onClick={() => setArray("test")}>Submit</button>
        <p>{array}</p>
    </div>);
}