import "./desktop-sim.css"
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
} from "react"
import {makeAutoObservable, observable, runInAction} from "mobx"
import {observer} from "mobx-react-lite"
import {Button, cx, HStack, truncate, VStack} from "./primitives"

const WINDOW_ASPECT_RATIO = 4 / 3
const WINDOW_MIN_WIDTH = 640
const WINDOW_MAX_WIDTH = 1042

export class WindowManager {
    private lastId = 1
    windows: DesktopWindow[] = []

    constructor() {
        makeAutoObservable<this, "lastId">(this, {
            lastId: false,
            windows: observable.shallow,
        })
    }

    close(win: DesktopWindow) {
        this.windows = this.windows.filter((w) => w !== win)
    }

    createWindow(element: React.ReactElement | null = null): DesktopWindow {
        const w = new DesktopWindow(this, this.lastId++)
        w.element = element
        this.windows.push(w)
        w.focus()
        return w
    }
}
export const WindowManagerContext = createContext<WindowManager>(null!)
export const useWindowManager = () => useContext(WindowManagerContext)

class DesktopWindow {
    private manager: WindowManager
    id: number
    title = "New Window"
    element: React.ReactElement | null = null
    focused = false
    details?: string | null = null
    dialog?: {title: string; element: React.ReactElement} | null = null

    constructor(manager: WindowManager, id: number) {
        this.manager = manager
        this.id = id
        makeAutoObservable<this, "manager">(this, {
            id: false,
            manager: false,
            element: observable.ref,
            dialog: observable.ref,
        })
    }

    focus() {
        if (this.focused) return
        this.focused = true
        for (const w of this.manager.windows) {
            w.focused = w === this
        }
    }

    close() {
        this.manager.close(this)
    }

    openDialog(title: string, element: React.ReactElement) {
        this.dialog = {title, element}
    }

    closeDialog() {
        this.dialog = null
    }
}

/**
 * Renders a simulated desktop and its active windows.
 */
export let Desktop = ({windows: wm}: {windows: WindowManager}) => {
    return (
        <WindowManagerContext.Provider value={wm}>
            <div className="desktop">
                <div className="desktop-body">
                    {wm.windows.map((win) => {
                        return <WindowObserver key={win.id} window={win} />
                    })}
                </div>
                <DesktopTaskbar />
            </div>
        </WindowManagerContext.Provider>
    )
}
Desktop = observer(Desktop)

// TODO: handle horizontal overflow.
let DesktopTaskbar = () => {
    const wm = useWindowManager()
    return (
        <HStack gap={0.5} className="desktop-taskbar">
            {wm.windows.map((win) => {
                return (
                    <Button
                        key={win.id}
                        onClick={() => win.focus()}
                        aria-selected={win.focused}
                    >
                        <img
                            src="/img/icon-file-explorer.png"
                            height={16}
                            width={16}
                            style={{marginRight: "0.5rem"}}
                        />
                        {truncate(win.title, 20, {prefix: true})}
                    </Button>
                )
            })}
        </HStack>
    )
}
DesktopTaskbar = observer(DesktopTaskbar)

/**
 * Renders a simulated desktop window.
 */
const Window = ({
    children,
    title,
    onClose,
    focused,
    onMouseDown,
    autoSize = true,
    draggable = true,
    canMinimize = true,
    canMaximize = true,
}: {
    children: React.ReactNode
    focused?: boolean
    autoSize?: boolean
    draggable?: boolean
    title?: string
    onClose?(): void
    onMouseDown?(): void
    canMinimize?: boolean
    canMaximize?: boolean
}) => {
    const ref = useRef<HTMLDivElement>(null!)
    const titlebarRef = useRef<HTMLElement>(null!)
    useAutoWindowSize(ref, autoSize)
    useDraggable(ref, titlebarRef, draggable)
    return (
        <div
            ref={ref}
            className={cx("window", focused && "focused")}
            onMouseDown={onMouseDown}
        >
            <header className="window-titlebar" ref={titlebarRef}>
                <span className="window-title truncate">{title}</span>
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

const WindowContext = createContext<DesktopWindow | null>(null)
export const useWindowContext = () => useContext(WindowContext)

/**
 * Wrapper around Window that observes changes to window state, whereas Window
 * is just a 'dumb' renderer that's reused in different ways.
 */
let WindowObserver = ({window: win}: {window: DesktopWindow}) => {
    const {focused, element, details, title, dialog} = win
    return (
        <WindowContext.Provider value={win}>
            <Window
                title={title}
                focused={focused}
                onClose={() => win.close()}
                onMouseDown={() => {
                    if (!focused) {
                        win.focus()
                    }
                }}
            >
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

/**
 * Renders a dialog (modal) window, masking the content behind it until closed.
 * The dialog can be closed by clicking outside of its content or by pressing
 * <Escape>.
 */
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
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose()
            }
        }
        document.addEventListener("keydown", handleKeydown)
        return () => {
            document.removeEventListener("keydown", handleKeydown)
        }
    }, [onClose])
    return (
        <div
            ref={ref}
            className="dialog"
            onClick={(e) => {
                // Close the dialog if the user clicks on the background mask.
                if (e.target === ref.current) {
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

/**
 * Sets the window details string in the host window, if it exists.
 */
export const useWindowTitle = (app: string, title?: string) => {
    const win = useWindowContext()
    useEffect(() => {
        if (!win) return
        runInAction(() => {
            win.title = title ? `${app} - ${title}` : app
        })
    }, [win, title])
}

/**
 * Sets the title in the host window, if it exists.
 */
export const useWindowDetails = (details: string | null | false) => {
    const win = useWindowContext()
    useEffect(() => {
        if (!win) return
        runInAction(() => {
            win.details = details || null
        })
    }, [win, details])
}

/**
 * Moves ref.current when draggableRef.current is dragged.
 */
const useDraggable = (
    ref: React.MutableRefObject<HTMLDivElement>,
    draggableRef: React.MutableRefObject<HTMLElement>,
    enabled: boolean,
) => {
    const handleDrag = useCallback(
        (e: MouseEvent) => {
            const elem = ref.current
            const rect = elem.getBoundingClientRect()
            const dx = e.movementX
            const dy = e.movementY
            elem.style.left = rect.x + dx + "px"
            elem.style.top = rect.y + dy + "px"
        },
        [ref],
    )
    useDragListener(draggableRef, handleDrag, enabled)
}

/**
 * Resizes ref.current based on the avaialble space in the browser window,
 * preserving the configured aspect ratio.
 *
 * TODO: resize if necessary when the browser window resizes.
 * TODO: better initial positioning for tiny screens.
 */
const useAutoWindowSize = (
    ref: React.MutableRefObject<HTMLDivElement>,
    enabled: boolean,
) => {
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
        let top = container.height / 2 - height / 2
        let left = container.width / 2 - width / 2

        // Quick hack for positioning this window so that it's slightly offset
        // from the previous one.
        // TODO: an "actual" solution to this that makes sure to reference the
        // correct window. Also probably involves storing window coordinates on
        // the instance and using that.
        const prev = document.querySelector(".window.focused")
        if (prev && prev !== elem) {
            const r = prev.getBoundingClientRect()
            top = r.top + 30
            left = r.left + 30
        }

        elem.style.top = top + "px"
        elem.style.left = left + "px"
        elem.style.width = width + "px"
        elem.style.height = height + "px"
    }, [ref, enabled])
}

/**
 * Reports mouse move events when user drags the target element. Accepts a
 * callback rather than returning a value to reduce re-renders in the calling
 * component. Expects the ref's interior value to be stable.
 */
export const useDragListener = (
    ref: React.MutableRefObject<HTMLElement>,
    onMouseMove: (e: MouseEvent) => void,
    enabled: boolean,
) => {
    useEffect(() => {
        const element = ref.current
        if (!element || !enabled) return

        let shouldReportDrag = false

        const handleMouseDown = (e: MouseEvent) => {
            // Ignore events on interactive elements.
            if (!isInteractiveElement(e.target as HTMLElement)) {
                shouldReportDrag = true
            }
        }

        const handleMouseUp = () => {
            shouldReportDrag = false
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (shouldReportDrag) {
                onMouseMove(e)
            }
        }

        element.addEventListener("mousedown", handleMouseDown, true)
        document.addEventListener("mouseup", handleMouseUp, true)
        document.addEventListener("mousemove", handleMouseMove, true)
        return () => {
            element.removeEventListener("mousedown", handleMouseDown)
            document.removeEventListener("mouseup", handleMouseUp)
            document.removeEventListener("mousemove", onMouseMove)
        }
    }, [ref, enabled, onMouseMove])
}

/**
 * Returns value bounded by min and max. If smaller than min, returns min.
 * If larger than max, returns max.
 */
const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max)
}

const isInteractiveElement = (elem: HTMLElement) => {
    return (
        elem.tagName === "BUTTON" ||
        elem.tagName === "INPUT" ||
        elem.tagName === "SELECT" ||
        elem.tagName === "TEXTAREA"
    )
}
