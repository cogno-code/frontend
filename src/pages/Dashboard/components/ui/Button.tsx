export default function Button(props: {content:String}) {
    return (
        <div>
            <button className="p-2 bg-pink-300">{props.content}</button>
        </div>
    );
}