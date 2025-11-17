import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div>
            <h1 className="bg-black text-white">Dashboard</h1>
            <p onClick={() => navigate('/study')}>Study</p>
        </div>
    );
}