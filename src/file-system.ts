import {computed, makeAutoObservable, observable, runInAction} from "mobx"

/**
 * FSItem represents all allowed items in a file system. It would be possible
 * to represent File and Directory as a single type, where File simply doesn't
 * have any children. However, splitting them into unique classes allows for
 * richer, type-specific APIs.
 */
export type FSItem = File | Directory

export class File {
    name: string
    type = "file" as const
    parent: Directory | null = null

    constructor(name: string) {
        this.name = name
        makeAutoObservable(this, {
            type: false,
            parent: observable.ref,
        })
    }
}

export class Directory {
    name: string
    type = "directory" as const
    parent: Directory | null = null
    children: FSItem[] = []

    constructor(name: string) {
        this.name = name
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

    delete(items: Set<FSItem>) {
        this.children = this.children.filter((child) => {
            return !items.has(child)
        })
    }
}

export class FSViewModel {
    cwd: Directory
    selection: Selection<FSItem>
    expandedDirs: Set<Directory> = new Set()

    constructor(dir: Directory) {
        this.cwd = dir
        this.selection = new Selection(this.cwd.children)
        makeAutoObservable(this, {
            cwd: observable.ref,
            expandedDirs: observable.shallow,
        })
    }

    expanded(item: FSItem): boolean {
        return computed(() => {
            return item.type === "directory" && this.expandedDirs.has(item)
        }).get()
    }

    toggleExpanded(dir: Directory, expanded?: boolean) {
        expanded = expanded ?? !this.expandedDirs.has(dir)
        if (expanded) {
            this.expandedDirs.add(dir)
        } else {
            this.expandedDirs.delete(dir)
        }
    }

    create(type: FSItem["type"], name: string): FSItem {
        name = name.trim()
        if (!name) {
            throw new Error("cannot create an item with an empty name")
        }
        return type === "file" ? new File(name) : new Directory(name)
    }

    selected(item: FSItem) {
        return computed(() => this.selection.has(item)).get()
    }

    deleteSelection() {
        this.cwd.delete(this.selection.items)
        this.selection = new Selection(this.cwd.children)
    }

    // TODO: verify performance on large number of elements. May be faster
    // to store cwd.children in sorted order and binary search to see if
    // an item exists with this name.
    isNameAvailable(name: string): boolean {
        return !this.cwd.children.find((item) => item.name === name)
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
        end = Math.min(end, this.source.length - 1)
        for (let i = start; i <= end; i++) {
            this.toggle(this.source[i], selected)
        }
    }

    fromClickEvent(item: T, e: MouseEvent) {
        if (e.shiftKey) {
            const start = this.source.indexOf(item)
            const end = this.source.indexOf(this.latest!)
            this.updateRange(start, end, true)
        } else if (e.ctrlKey) {
            this.toggle(item)
        } else {
            this.clear()
            this.add(item)
        }
    }
}

export interface FSTreeItem {
    item: FSItem
    depth: number
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
            for (const item of dir.children) {
                items.push({item, depth})
                if (item.type === "directory" && this.view.expanded(item)) {
                    walk(item, depth + 1)
                }
            }
        }
        walk(this.view.cwd)
        return items
    }
}

export const seedDirectory = (dir: Directory, count: number) => {
    runInAction(() => {
        {
            let d = dir.add(new Directory("Directory 1"))
            d.add(new File("File 1"))
            d.add(new File("File 2"))
            d.add(new File("File 3"))
        }
        {
            let d = dir.add(new Directory("Directory 2"))
            d.add(new File("File 1"))
            d.add(new File("File 2"))
            d.add(new File("File 3"))
            {
                let dd = d.add(new Directory("Directory 1"))
                dd.add(new File("File 1"))
                dd.add(new File("File 2"))
                dd.add(new File("File 3"))
            }
            {
                let dd = d.add(new Directory("Directory 2"))
                dd.add(new File("File 1"))
                dd.add(new File("File 2"))
                dd.add(new File("File 3"))
                {
                    let ddd = dd.add(new Directory("Directory 1"))
                    ddd.add(new File("File 1"))
                    ddd.add(new File("File 2"))
                    ddd.add(new File("File 3"))
                }
            }
        }
        for (let i = 1; i <= count; i++) {
            dir.add(new File(`File ${i}`))
        }
    })
}
