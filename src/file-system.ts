import {makeAutoObservable, observable} from "mobx"

/**
 * FSItem represents all allowed items in a file system. It would be possible
 * to represent File and Directory as a single type, where File simply doesn't
 * have any children. However, splitting them into unique classes allows for
 * richer, type-specific APIs.
 */
export type FSItem = File | Directory

export class File {
    name: string
    type: "file"
    parent: Directory | null

    constructor(name: string) {
        this.name = name
        this.type = "file"
        this.parent = null
        makeAutoObservable(this, {
            type: false,
            parent: observable.ref,
        })
    }
}

export class Directory {
    name: string
    type: "directory"
    parent: Directory | null
    children: FSItem[]

    constructor(name: string) {
        this.name = name
        this.type = "directory"
        this.children = []
        this.parent = null
        makeAutoObservable(this, {
            type: false,
            parent: observable.ref,
            children: observable.shallow,
        })
    }

    add<T extends FSItem>(item: T): T {
        item.parent = this
        this.children.push(item)
        return item
    }
}

export class FSViewModel {
    cwd: Directory
    selection: Selection<FSItem>

    constructor(dir: Directory) {
        this.cwd = dir
        this.selection = new Selection(this.cwd.children)
        makeAutoObservable(this, {
            cwd: observable.ref,
        })
    }

    createFile(name = "New file"): File {
        const file = new File(name)
        this.cwd.add(file)
        return file
    }

    createDirectory(name = "New directory"): Directory {
        const directory = new Directory(name)
        this.cwd.add(directory)
        return directory
    }

    selected(item: FSItem) {
        return this.selection.has(item)
    }
}

/**
 * Selection holds a unique set of T. It's separate from FSViewModel because
 * it should be possible for the user to create different selections across
 * views even if they share the same view model. For similar reasons, selection
 * state is not tracked on the item itself, since that selection state is
 * contextual (i.e. it may be selected in one view but not another).
 *
 * Currently this class isn't much more than a proxy around an observable set,
 * so it's a bit silly. Since it's not the objective of this exercise, I'm not
 * sure I'll be able to flesh this out entirely, but in the Real World it
 * should handle actions such as selection undo/redo, so I'm representing it
 * accordingly.
 */
class Selection<T> {
    private selection: Set<T>
    private items: T[]
    private last: T | null

    constructor(items: T[] = []) {
        this.selection = new Set()
        this.items = items
        this.last = null
        makeAutoObservable<this, "selection" | "items" | "last">(this, {
            selection: observable.shallow,
            items: false,
            last: false,
        })
    }

    clear() {
        this.last = null
        this.selection.clear()
    }

    has(item: T): boolean {
        return this.selection.has(item)
    }

    add(item: T) {
        this.last = item
        this.selection.add(item)
    }

    delete(item: T) {
        this.selection.delete(item)
    }

    update(item: T, selected: boolean) {
        if (selected) {
            this.add(item)
        } else {
            this.delete(item)
        }
    }

    updateRange(start: number, end: number, selected: boolean) {
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
        end = Math.min(end, this.items.length - 1)
        for (let i = start; i <= end; i++) {
            this.update(this.items[i], selected)
        }
    }

    fromClickEvent(item: T, e: MouseEvent) {
        e.preventDefault()

        const selected = this.has(item)
        if (e.shiftKey) {
            const start = this.items.indexOf(item)
            const end = this.items.indexOf(this.last!)
            this.updateRange(start, end, true)
        } else if (e.ctrlKey) {
            this.update(item, !selected)
        } else {
            this.clear()
            this.add(item)
        }
    }
}
