import "./virtualizer.css"
import {memo, useEffect, useRef, useState} from "react"
import {makeAutoObservable} from "mobx"
import {FSItem, FSViewModel, Directory} from "./file-system"

interface IVirtualizer<T> {
    items: T[]
    itemHeight: number
    bufferSize?: number
    renderItem(item: T, position: {top: number}): React.ReactElement
}

// TODO: it's possible to entirely avoid a render when scroll position changes
// if the already-rendered elements sufficiently cover the visible region.
// This naive approach seems to yield acceptable performance right now, but
// it's ripe for optimization.
export let Virtualizer = <T,>({
    items,
    itemHeight,
    bufferSize = 10,
    renderItem,
}: IVirtualizer<T>) => {
    const viewportRef = useRef<HTMLDivElement>(null!)
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
            children.push(renderItem(item, {top: i * itemHeight}))
        }
        return children
    }

    return (
        <div className="virtualizer" ref={viewportRef} onScroll={handleScroll}>
            <div className="virtualizer-body" style={{height: height + "px"}}>
                {height > 0 && renderItems()}
            </div>
        </div>
    )
}
Virtualizer = memo(Virtualizer) as any

export interface FSTreeItem {
    key: string
    item: FSItem
    depth: number
    setSize: number
    posInSet: number

    // TODO: this is kind of leaky. We need a way to select a range of items
    // in the file tree when they're distributed across different directories.
    // There's definitely a better solution here, but this fixes the immediate
    // problem of range selection being broken when it spans multiple directories.
    items: FSTreeItem[]
    index: number
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

        // an item's original index from the view model.
        let index = 0

        const walk = (dir: Directory, depth = 0) => {
            for (let i = 0; i < dir.children.length; i++) {
                index++

                const item = dir.children[i]
                items.push({
                    key: item.path,
                    item,
                    items,
                    index,
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
