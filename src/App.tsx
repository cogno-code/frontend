import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Login from "./Login";
import Signup from "./Signup";
import Dashboard from "./pages/Dashboard/Dashboard";
import Study from "./Study";
import Memo from "./pages/Memo/Memo";
import TimelinePage from "./pages/Timeline/Timeline";
import DocsPage from "./pages/Docs/Docs";
import TestPage from "./TestPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/signup" element={<Signup/>}/>
        <Route path="/dashboard" element={<Dashboard/>}/>
        <Route path="/study" element={<Study/>}/>
        <Route path="/memo" element={<Memo/>}/>
        <Route path="/timeline" element={<TimelinePage/>}/>
        <Route path="/docs" element={<DocsPage/>} />
        <Route path="/test" element={<TestPage/>}/>
      </Routes>
    </BrowserRouter>
  );
}