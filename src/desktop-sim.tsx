import "./desktop-sim.css"
import {createContext} from "react"
import {makeAutoObservable, observable} from "mobx"
import {observer} from "mobx-react-lite"

export let Desktop = ({windows: wm}: {windows: WindowManager}) => {
    return (
        <div className="desktop">
            <div className="desktop-body">
                {wm.windows.map((win) => {
                    return (
                        <Window key={win.id} window={win}>
                            {win.element}
                        </Window>
                    )
                })}
            </div>
        </div>
    )
}
Desktop = observer(Desktop)

export class WindowManager {
    lastId: number
    windows: DesktopWindow[]

    constructor() {
        this.lastId = 1
        this.windows = []
        makeAutoObservable(this, {
            lastId: false,
            windows: observable.shallow,
        })
    }

    createWindow(element: React.ReactElement | null = null): DesktopWindow {
        const w = new DesktopWindow(this, this.lastId++)
        w.element = element
        this.windows.push(w)
        return w
    }
}

class DesktopWindow {
    id: number
    manager: WindowManager
    title: string
    element: React.ReactElement | null

    constructor(manager: WindowManager, id: number) {
        this.id = id
        this.manager = manager
        this.title = "New Window"
        this.element = null
        makeAutoObservable(this, {
            manager: false,
            element: observable.ref,
        })
    }
}

let Window = ({
    window: win,
    children,
}: {
    window: DesktopWindow
    children: React.ReactNode
}) => {
    return (
        <WindowContext.Provider value={win}>
            <div className="window">
                <header className="window-titlebar">
                    <span className="window-title">{win.title}</span>
                </header>
                <div className="window-body">{children}</div>
            </div>
        </WindowContext.Provider>
    )
}
Window = observer(Window)

const WindowContext = createContext<DesktopWindow>(null!)
