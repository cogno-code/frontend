export default function Button(props: {content:String}) {
    return (
        <div>
            <button className="bg-gray-400 text-black">{props.content}</button>
        </div>
    );
}