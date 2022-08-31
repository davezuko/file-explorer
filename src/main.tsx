import {createRoot} from "react-dom/client"

const main = () => {
    const root = createRoot(document.getElementById("root")!)
    root.render(<App />)
}

const App = () => {
    return <h1>Hello world</h1>
}

main()
