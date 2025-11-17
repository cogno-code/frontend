export default function Card(props: {content:String}) {
    return(
        <div className="bg-red-200">
            <h1>{props.content}</h1>
        </div>
    );
}