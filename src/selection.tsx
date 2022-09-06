import {makeAutoObservable, observable} from "mobx"

/**
 * Selection holds a unique set of T. It's separate from FSViewModel because
 * it should be possible for the user to create different selections across
 * views even if they share the same view model. For similar reasons, selection
 * state is not tracked on the item itself, since that selection state is
 * contextual (i.e. it may be selected in one view but not another).
 *
 * I'm not sure I'll be able to flesh this out entirely, but in the Real World it
 * should handle actions such as selection undo/redo, so I'm representing it
 * accordingly.
 */
export class Selection<T> {
    latest: T | null = null
    items: Set<T> = new Set()
    source: T[]

    constructor(source: T[] = []) {
        this.source = source
        makeAutoObservable(this, {
            items: observable.shallow,
            source: false,
            latest: false,
        })
    }

    get size() {
        return this.items.size
    }

    clear() {
        this.latest = null
        this.items.clear()
    }

    has(item: T): boolean {
        return this.items.has(item)
    }

    add(item: T) {
        this.latest = item
        this.items.add(item)
    }

    delete(item: T) {
        this.items.delete(item)
    }

    toggle(item: T, selected?: boolean) {
        selected = selected ?? !this.has(item)
        if (selected) {
            this.add(item)
        } else {
            this.delete(item)
        }
    }

    selectOne(item: T) {
        this.clear()
        this.add(item)
    }

    selectRange(
        items: T[],
        start: number,
        end: number,
        selected: boolean = true,
    ) {
        if (start < 0) {
            throw new Error(`start index must be >= 0, got: ${start}`)
        }
        if (end < 0) {
            throw new Error(`end index must be >= 0, got: ${end}.`)
        }

        // Range is allowed to go backwards (e.g. 5 -> 0), but simplify
        // our iteration by putting them in ascending order.
        if (end < start) {
            ;[start, end] = [end, start]
        }

        // We could throw if `end` exceeds the bounds of `items`, or we could
        // select as many items as possible that fit the range. I've chosen the
        // latter, and in the Real World would probably return the count of
        // items or range that actually got selected. I think that's a safer
        // API than forcing each caller to gracefully handle an error when
        // it's not as catastrophic as the earlier assertions.
        end = Math.min(end, items.length - 1)
        for (let i = start; i <= end; i++) {
            this.toggle(items[i], selected)
        }
    }

    fromClickEvent(items: T[], item: T, e: MouseEvent) {
        switch (getClickIntent(e)) {
            case SelectionIntent.SelectRange: {
                const start = items.indexOf(item)
                const end = items.indexOf(this.latest!)
                this.selectRange(items, start, end, true)
                break
            }
            case SelectionIntent.ToggleOne:
                this.toggle(item)
                break
            case SelectionIntent.SelectOne:
                this.selectOne(item)
                break
        }
    }
}

export enum SelectionIntent {
    ToggleOne,
    SelectOne,
    SelectRange,
    SelectAll,
    Delete,
}
export const getKeyboardIntent = (e: KeyboardEvent): SelectionIntent | null => {
    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        return SelectionIntent.SelectAll
    } else if (e.key === "Delete" || e.key === "Backspace") {
        return SelectionIntent.Delete
    }
    return null
}

export const getClickIntent = (e: MouseEvent): SelectionIntent | null => {
    // only listen to clicks made with the left mouse button.
    if (e.button !== 0) {
        return null
    }
    if (e.shiftKey) {
        return SelectionIntent.SelectRange
    } else if (e.ctrlKey) {
        return SelectionIntent.ToggleOne
    } else {
        return SelectionIntent.SelectOne
    }
}
