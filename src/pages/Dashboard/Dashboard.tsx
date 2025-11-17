import { useNavigate } from "react-router-dom";
import { Button, Card } from "./components/form";

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div>
            <h1 className="bg-black text-white">Dashboard</h1>
            <p onClick={() => navigate('/study')}>Study</p>
            <Button content={"Hello"}/>
            <Card content={"This is a card."}/>
        </div>
    );
}