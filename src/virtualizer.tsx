import "./virtualizer.css"
import {useEffect, useRef, useState} from "react"

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
