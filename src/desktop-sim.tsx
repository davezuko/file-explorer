import "./desktop-sim.css"
import {
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
} from "react"
import {makeAutoObservable, observable, runInAction} from "mobx"
import {observer} from "mobx-react-lite"
import {Button, HStack, VStack} from "./primitives"

const WINDOW_ASPECT_RATIO = 4 / 3
const WINDOW_MIN_WIDTH = 640
const WINDOW_MAX_WIDTH = 1042

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
    details?: string | null
    dialog?: {title: string; element: React.ReactElement} | null

    constructor(manager: WindowManager, id: number) {
        this.id = id
        this.manager = manager
        this.title = "New Window"
        this.element = null
        this.dialog = null
        this.details = null
        makeAutoObservable(this, {
            manager: false,
            element: observable.ref,
            dialog: observable.ref,
        })
    }

    openDialog(title: string, element: React.ReactElement) {
        this.dialog = {title, element}
    }

    closeDialog() {
        this.dialog = null
    }
}

const WindowContext = createContext<DesktopWindow>(null!)
export const useWindowContext = () => useContext(WindowContext)

export let Desktop = ({windows: wm}: {windows: WindowManager}) => {
    return (
        <div className="desktop">
            <div className="desktop-body">
                {wm.windows.map((win) => {
                    return <WindowObserver key={win.id} window={win} />
                })}
            </div>
        </div>
    )
}
Desktop = observer(Desktop)

let WindowObserver = ({window: win}: {window: DesktopWindow}) => {
    const {element, details, title, dialog} = win
    return (
        <WindowContext.Provider value={win}>
            <Window title={title}>
                <VStack flex={1} className="window-viewport">
                    {element}
                </VStack>
                {details && (
                    <footer className="window-footer">
                        Details: {details}
                    </footer>
                )}
                {dialog && (
                    <Dialog
                        title={dialog.title}
                        onClose={() => win.closeDialog()}
                    >
                        {dialog.element}
                    </Dialog>
                )}
            </Window>
        </WindowContext.Provider>
    )
}
WindowObserver = observer(WindowObserver)

let Window = ({
    children,
    title,
    onClose,
    autoSize = true,
    draggable = true,
    canMinimize = true,
    canMaximize = true,
}: {
    children: React.ReactNode
    autoSize?: boolean
    draggable?: boolean
    title?: string
    onClose?(): void
    canMinimize?: boolean
    canMaximize?: boolean
}) => {
    const ref = useRef<HTMLDivElement>(null!)
    const titlebarRef = useRef<HTMLElement>(null!)
    useAutoWindowSize(ref, autoSize)
    useMakeDraggable(ref, titlebarRef, draggable)
    return (
        <div className="window" ref={ref}>
            <header className="window-titlebar" ref={titlebarRef}>
                <span className="window-title">{title}</span>
                <HStack gap={0.25} className="window-buttons">
                    {canMinimize && <Button title="inop">-</Button>}
                    {canMaximize && <Button title="inop">+</Button>}
                    <Button title="Close" onClick={onClose}>
                        x
                    </Button>
                </HStack>
            </header>
            <VStack className="window-body">{children}</VStack>
        </div>
    )
}
Window = observer(Window)

export const Dialog = ({
    title,
    onClose,
    children,
}: {
    title: string
    children: React.ReactNode
    onClose(): void
}) => {
    const ref = useRef<HTMLDivElement>(null!)
    return (
        <div
            ref={ref}
            className="dialog"
            onClick={(e) => {
                if (!ref.current?.contains(e.target as any)) {
                    onClose()
                }
            }}
        >
            <Window
                title={title}
                autoSize={false}
                draggable={false}
                canMaximize={false}
                canMinimize={false}
                onClose={onClose}
            >
                {children}
            </Window>
        </div>
    )
}

export const useWindowDetails = (details: string | null) => {
    const win = useWindowContext()
    useEffect(() => {
        runInAction(() => {
            win.details = details
        })
    }, [win, details])
}

export const useWindowTitle = (app: string, title?: string) => {
    const win = useWindowContext()
    useEffect(() => {
        runInAction(() => {
            win.title = title ? `${app} - ${title}` : app
        })
    }, [win, title])
}

const useMakeDraggable = (
    ref: React.MutableRefObject<HTMLDivElement>,
    draggableRef: React.MutableRefObject<HTMLElement>,
    enabled: boolean,
) => {
    // The window can be moved by dragging its titlebar.
    useDragListener(draggableRef, (e) => {
        const elem = ref.current
        if (!elem || !enabled) return

        const rect = elem.getBoundingClientRect()
        const dx = e.movementX
        const dy = e.movementY
        elem.style.left = rect.x + dx + "px"
        elem.style.top = rect.y + dy + "px"
    })
}

const useAutoWindowSize = (
    ref: React.MutableRefObject<HTMLDivElement>,
    enabled: boolean,
) => {
    // size this window based on the available space in the browser window,
    // preserving intended aspect ratio.
    // TODO: resize if necessary when the browser window resizes.
    // TODO: better initial positioning for tiny screens.
    useLayoutEffect(() => {
        const elem = ref.current
        if (!elem || !enabled) return

        const container = document.body.getBoundingClientRect()
        const width = clamp(
            Math.round(container.width * 0.65),
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
    }, [ref, enabled])
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
