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
        this.selection = new Selection()
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

    constructor() {
        this.selection = new Set()
        makeAutoObservable<this, "selection">(this, {
            selection: observable.shallow,
        })
    }

    clear() {
        this.selection.clear()
    }

    has(item: T): boolean {
        return this.selection.has(item)
    }

    add(item: T) {
        this.selection.add(item)
    }

    delete(item: T) {
        this.selection.delete(item)
    }
}
