import React from "react"
import ReactDOM from "react-dom/client"
import CorgiLanding from "./pages/CorgiLanding"
import CorgiGuestbook from "./pages/CorgiGuestbook"
import "./index.css"

const path = window.location.pathname.replace(/\/$/, "") || "/"
const Page = path === "/chat" ? CorgiGuestbook : CorgiLanding

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Page />
  </React.StrictMode>,
)
