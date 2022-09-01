import {makeAutoObservable, observable, runInAction} from "mobx"

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

    delete(items: Set<FSItem>) {
        this.children = this.children.filter((child) => {
            return !items.has(child)
        })
    }
}

export class FSViewModel {
    cwd: Directory
    selection: Selection<FSItem>
    expandedDirs: Set<Directory>

    constructor(dir: Directory) {
        this.cwd = dir
        this.selection = new Selection(this.cwd.children)
        this.expandedDirs = new Set()
        makeAutoObservable(this, {
            cwd: observable.ref,
            expandedDirs: observable.shallow,
        })
    }

    expanded(item: Directory) {
        return this.expandedDirs.has(item)
    }

    toggleExpanded(dir: Directory, expanded?: boolean) {
        expanded = expanded ?? !this.expandedDirs.has(dir)
        if (expanded) {
            this.expandedDirs.add(dir)
        } else {
            this.expandedDirs.delete(dir)
        }
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

    deleteSelection() {
        this.cwd.delete(this.selection.items)
        this.selection = new Selection(this.cwd.children)
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
    private last: T | null
    items: Set<T>
    source: T[]

    constructor(source: T[] = []) {
        this.items = new Set()
        this.source = source
        this.last = null
        makeAutoObservable<this, "items" | "last">(this, {
            items: observable.shallow,
            source: false,
            last: false,
        })
    }

    clear() {
        this.last = null
        this.items.clear()
    }

    has(item: T): boolean {
        return this.items.has(item)
    }

    add(item: T) {
        this.last = item
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
            const end = this.source.indexOf(this.last!)
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
