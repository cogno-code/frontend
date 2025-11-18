export default function Card(props: {content:String}) {
    return(
        <div className="p-2 bg-yellow-500">
            <h1>{props.content}</h1>
        </div>
    );
}