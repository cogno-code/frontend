export default function Study() {

    const submit = [1, 2, 3, 2, 4, 4, 2, 3, 1, 2];
    const answer = [2, 2, 3, 3, 1, 2, 4, 2, 3, 2];
    
    function scoring(submit:Array<Number>, answer:Array<Number>): Array<String> {
        let temp = [];
        for (let i = 0; i < submit.length; i++) {
            if (submit[i] == answer[i]) temp.push("o");
            else temp.push("x");
        }
        return temp;
    }
    return (
        <div className="    ">
            <h1 className="text-3xl m-5 shadow-md bg-neutral-500">Study</h1>
            <h2>SQLD 자격검정 문제집</h2>
            <p>채점 결과: </p>
            <p>{scoring(submit, answer)}</p>

        
        </div>
    );
}