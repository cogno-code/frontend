import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
    const navigate = useNavigate();

    function signupComplete() {
        alert("Sign up successfully");
        navigate("/login")
    }

    return (
        <div>
            <h1>Signup</h1>
            <p>Username: </p>
            <input></input>
            <p>Password: </p>
            <input type="password"></input>
            <p>Password (rewrite): </p>
            <input type="password"></input>
            <p>Email: </p>
            <input type="email"></input>
            <button onClick={signupComplete}>Sign Up</button>
            <Link to="/login">Already have an account? Go to Login page</Link>
        </div>
    );
}