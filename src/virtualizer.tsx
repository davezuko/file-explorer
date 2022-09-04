import "./virtualizer.css"
import {useEffect, useRef, useState} from "react"
import {makeAutoObservable} from "mobx"
import {FSItem, FSViewModel, Directory} from "./file-system"

interface IVirtualizer<T> {
    items: T[]
    itemHeight: number
    bufferSize?: number
    renderItem(item: T, style: React.CSSProperties): React.ReactElement
}
export let Virtualizer = <T,>({
    items,
    itemHeight,
    bufferSize = 10,
    renderItem,
}: IVirtualizer<T>) => {
    const viewportRef = useRef<HTMLDivElement>(null!)
    const [ready, setReady] = useState(false)
    const [scrollTop, setScrollTop] = useState(0)
    const [viewportHeight, setViewportHeight] = useState(0)
    const height = items.length * itemHeight

    const handleScroll = () => {
        const viewport = viewportRef.current
        setScrollTop(viewport.scrollTop)
    }

    useEffect(() => {
        const ro = new ResizeObserver((entries) => {
            const viewport = entries[0]!
            const height = viewport.contentRect.height
            setViewportHeight(height)
        })
        ro.observe(viewportRef.current)
        handleScroll()
        setReady(true)
        return () => {
            ro.disconnect()
        }
    }, [itemHeight])

    const renderItems = () => {
        const visibleCount = Math.ceil(viewportHeight / itemHeight)

        let start = Math.floor((scrollTop / height) * items.length)
        let end = start + visibleCount
        start = Math.max(0, start - bufferSize)
        end = Math.min(items.length, end + bufferSize)

        const children: React.ReactElement[] = []
        for (let i = start; i < end; i++) {
            const item = items[i]
            if (!item) {
                break
            }
            children.push(
                renderItem(item, {
                    position: "absolute",
                    top: i * itemHeight + "px",
                }),
            )
        }
        return children
    }

    // console.log({scrollTop, height, viewportHeight, offset, start, end})
    // console.log({start, end, visible, bufferSize})
    // console.log("[virtualizer] render %s items (max: %s)", children.length)
    return (
        <div className="virtualizer" ref={viewportRef} onScroll={handleScroll}>
            <div style={{position: "relative", height: height + "px"}}>
                {ready && renderItems()}
            </div>
        </div>
    )
}

export interface FSTreeItem {
    key: string
    item: FSItem
    depth: number
    setSize: number
    posInSet: number
}
export class FSTreeVirtualizer {
    private view: FSViewModel

    constructor(view: FSViewModel) {
        this.view = view
        makeAutoObservable<this, "view">(this, {
            view: false,
        })
    }

    // TODO: this should either be an iterator or accept a start/end index so
    // that we don't have to walk the whole tree when only a subset is needed.
    get items(): FSTreeItem[] {
        const items: FSTreeItem[] = []
        const walk = (dir: Directory, depth = 0) => {
            for (let i = 0; i < dir.children.length; i++) {
                const item = dir.children[i]
                items.push({
                    key: item.path,
                    item,
                    setSize: dir.children.length,
                    posInSet: i,
                    depth,
                })
                if (item.type === "directory" && this.view.expanded(item)) {
                    walk(item, depth + 1)
                }
            }
        }
        walk(this.view.cwd)
        return items
    }
}
