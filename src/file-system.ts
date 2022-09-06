import {computed, makeAutoObservable, observable} from "mobx"
import {Selection} from "./selection"

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

    get path() {
        return filepath(this)
    }

    get ext(): string {
        const parts = this.name.split(".")
        if (parts.length === 1) {
            return this.name.startsWith(".") ? parts[0] : ""
        } else {
            return parts.at(-1) || ""
        }
    }
}

export class Directory {
    private _children: FSItem[] = []
    private _deleted = false
    name: string
    type = "directory" as const
    parent: Directory | null = null

    constructor(name: string) {
        this.name = name
        makeAutoObservable<this, "_children" | "_deleted">(this, {
            _children: observable.shallow,
            _deleted: true,
            type: false,
            parent: observable.ref,
        })
    }

    get path() {
        return filepath(this)
    }

    get deleted(): boolean {
        return this._deleted || !!this.parent?._deleted
    }

    delete() {
        this._deleted = true
        this._children = []
    }

    add<T extends FSItem>(item: T): T {
        if (this.deleted) {
            throw new Error("cannot add item to a deleted directory")
        }
        item.parent = this
        this._children.push(item)
        return item
    }

    // TODO: sort items as they are added to the list. I've skipped that for
    // now since this getter returns a cached value until children changes,
    // which yields acceptable performance. A better approach might be one of:
    //
    // a. implement binary search insertion, since items are sorted.
    // b. make users call .sort() when they are done manipulating the list, since
    //    we don't want to continually resort if items are added in bulk.
    // c. queue inserted items and only sort once .children is requested.
    get children() {
        return this._children
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
    }

    remove(items: Set<FSItem>) {
        this._children = this._children.filter((child) => {
            if (!items.has(child)) return true
            if (child.type === "directory") {
                child.delete()
            }
            return false
        })
    }
}

/**
 * Returns an FSItem's absolute filepath, e.g. "/foo/bar/baz/qux.txt"
 */
const filepath = (item: FSItem): string => {
    let parts: string[] = []
    do {
        parts.unshift(item.name)
        item = item.parent!
    } while (item)
    return parts.join("/")
}

export class FSViewModel {
    private _cwd: Directory
    selection: Selection<FSItem>
    expandedDirs: Set<Directory> = new Set()

    constructor(dir: Directory) {
        this._cwd = dir
        this.selection = new Selection(this._cwd.children)
        makeAutoObservable<this, "_cwd">(this, {
            _cwd: observable.ref,
            expandedDirs: observable.shallow,
        })
    }

    get cwd() {
        return this._cwd
    }

    set cwd(dir: Directory) {
        this.selection.clear()
        // TODO: track location change in history for back/forward history.
        this._cwd = dir
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
        // TODO: would theoretically be more efficient to topologically sort
        // items scheduled for deletion so that we don't bother with child
        // items if their parent is also going to be deleted.
        const parents = new Map<Directory, Set<FSItem>>()
        for (const item of this.selection.items) {
            if (!item.parent) continue

            let group = parents.get(item.parent)
            if (!group) {
                group = new Set()
                parents.set(item.parent, group)
            }
            group.add(item)
        }
        for (const [parent, items] of parents) {
            parent.remove(items)
        }
        this.selection = new Selection(this.cwd.children)
    }

    // TODO: verify performance on large number of elements. May be faster
    // to store cwd.children in sorted order and binary search to see if
    // an item exists with this name.
    isNameAvailable(name: string): boolean {
        return !this.cwd.children.find((item) => item.name === name)
    }
}

export const parents = (item: FSItem): Directory[] => {
    const parents: Directory[] = []
    do {
        item = item.parent!
        if (item) {
            parents.unshift(item)
        }
    } while (item)
    return parents
}

let filenameSuffix = 1

export const seedDirectory = (root: Directory, total: number) => {
    const extensions = [
        "txt",
        "ppt",
        "xls",
        "doc",
        "docx",
        "lua",
        "rb",
        "py",
        "js",
        "jsx",
        "json",
        "ts",
        "tsx",
        "jpeg",
        "wav",
        "mp3",
        "mov",
        "mp4",
        "avi",
        "flv",
        "swf",
        "webm",
    ]

    let remaining = total

    const dir = (name?: string) => {
        remaining--
        if (name) {
            return new Directory(name)
        }
        return new Directory(`directory-${filenameSuffix++}`)
    }
    const file = (name?: string) => {
        remaining--
        if (name) {
            return new File(name)
        }
        const ext = extensions[Math.floor(Math.random() * extensions.length)]
        return new File(`file-${filenameSuffix++}.${ext}`)
    }

    // Please just ignore how awful this function is. I threw something
    // together to try to get a realistic distribution of files vs. folders
    // that trails off the deeper you get. It works "fine" for a demo.
    const seed = (parent: Directory, max: number) => {
        if (!remaining) return

        const items = Math.ceil(Math.random() * max)
        const fcount = Math.round(items * 0.75)
        const dcount = Math.min(items - fcount, 3)

        for (let i = 0; i < fcount; i++) {
            if (!remaining) return
            parent.add(file())
        }
        for (let i = 0; i < dcount; i++) {
            if (remaining < 2) return
            const d = parent.add(dir())
            seed(d, Math.ceil(Math.random() * (items / dcount)))
        }
    }

    while (remaining > 0) {
        seed(root, remaining)
    }
}
