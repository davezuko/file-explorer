import "./desktop-sim.css"
import {createContext, useEffect, useLayoutEffect, useRef} from "react"
import {makeAutoObservable, observable} from "mobx"
import {observer} from "mobx-react-lite"

const WINDOW_ASPECT_RATIO = 4 / 3
const WINDOW_MIN_WIDTH = 480
const WINDOW_MAX_WIDTH = 768

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

const WindowContext = createContext<DesktopWindow>(null!)

let Window = ({
    window: win,
    children,
}: {
    window: DesktopWindow
    children: React.ReactNode
}) => {
    const ref = useRef<HTMLDivElement>(null!)
    const titlebarRef = useRef<HTMLElement>(null!)
    useWindowBehavior(ref, titlebarRef)
    return (
        <WindowContext.Provider value={win}>
            <div className="window" ref={ref}>
                <header className="window-titlebar" ref={titlebarRef}>
                    <span className="window-title">{win.title}</span>
                </header>
                <div className="window-body">{children}</div>
            </div>
        </WindowContext.Provider>
    )
}
Window = observer(Window)

const useWindowBehavior = (
    ref: React.MutableRefObject<HTMLDivElement>,
    titlebarRef: React.MutableRefObject<HTMLElement>,
) => {
    // size this window based on the available space in the browser window,
    // preserving intended aspect ratio.
    // TODO: resize if necessary when the browser window resizes.
    // TODO: better initial positioning for tiny screens.
    useLayoutEffect(() => {
        const elem = ref.current
        if (!elem) return

        const container = document.body.getBoundingClientRect()
        const width = clamp(
            Math.round(container.width * 0.5),
            WINDOW_MIN_WIDTH,
            WINDOW_MAX_WIDTH,
        )
        const height = width / WINDOW_ASPECT_RATIO
        const top = container.height / 2 - height / 2
        const left = container.width / 2 - width / 2
        elem.style.top = top + "px"
        elem.style.left = left + "px"
        elem.style.width = width + "px"
        elem.style.height = height + "px"
    }, [ref, titlebarRef])

    // The window can be moved by dragging its titlebar.
    useDragListener(titlebarRef, (e) => {
        const elem = ref.current
        if (!elem) return

        const rect = elem.getBoundingClientRect()
        const dx = e.movementX
        const dy = e.movementY
        elem.style.left = rect.x + dx + "px"
        elem.style.top = rect.y + dy + "px"
    })
}

/**
 * Reports mouse move events when the user is dragging the target element.
 * Accepts a callback rather than returning a value to reduce re-renders
 * in the calling component. Expects the ref's interior value to be stable.
 */
export const useDragListener = (
    ref: React.MutableRefObject<HTMLElement>,
    onMouseMove: (e: MouseEvent) => void,
) => {
    // Avoid thrashing the document with add/remove event listeners just
    // because the callback changed.
    const callback = useRef<typeof onMouseMove>(onMouseMove)
    callback.current = onMouseMove
    useEffect(() => {
        const element = ref.current
        let mousedown = false
        const handleMouseDown = () => {
            mousedown = true
        }
        const handleMouseUp = () => {
            mousedown = false
        }
        const handleMouseMove = (e: MouseEvent) => {
            if (mousedown) {
                e.preventDefault()
                callback.current(e)
            }
        }
        element.addEventListener("mousedown", handleMouseDown, true)
        document.addEventListener("mouseup", handleMouseUp, true)
        document.addEventListener("mousemove", handleMouseMove, true)
        return () => {
            element.removeEventListener("mousedown", handleMouseDown)
            document.removeEventListener("mouseup", handleMouseUp)
            document.removeEventListener("mousemove", handleMouseMove)
        }
    }, [ref])
}

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max)
}
