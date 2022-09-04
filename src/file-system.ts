import {computed, makeAutoObservable, observable, runInAction} from "mobx"
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
        return this.name.split(".").at(-1)!
    }
}

export class Directory {
    private _children: FSItem[] = []
    name: string
    type = "directory" as const
    parent: Directory | null = null

    constructor(name: string) {
        this.name = name
        makeAutoObservable<this, "_children">(this, {
            type: false,
            parent: observable.ref,
            _children: observable.shallow,
        })
    }

    get path() {
        return filepath(this)
    }

    add<T extends FSItem>(item: T): T {
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

    delete(items: Set<FSItem>) {
        this._children = this._children.filter((child) => {
            return !items.has(child)
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

export const seedDirectory = (dir: Directory, count: number) => {
    runInAction(() => {
        {
            let d = dir.add(new Directory("directory-1"))
            d.add(new File("file-1.txt"))
            d.add(new File("file-2.txt"))
            d.add(new File("file-3.txt"))
        }
        {
            let d = dir.add(new Directory("directory-2"))
            d.add(new File("file-1.txt"))
            d.add(new File("file-2.txt"))
            d.add(new File("file-3.txt"))
            {
                let dd = d.add(new Directory("directory-1"))
                dd.add(new File("file-1.txt"))
                dd.add(new File("file-2.txt"))
                dd.add(new File("file-3.txt"))
            }
            {
                let dd = d.add(new Directory("directory-2"))
                dd.add(new File("file-1.txt"))
                dd.add(new File("file-2.txt"))
                dd.add(new File("file-3.txt"))
                {
                    let ddd = dd.add(new Directory("directory-1"))
                    ddd.add(new File("file-1.txt"))
                    ddd.add(new File("file-2.txt"))
                    ddd.add(new File("file-3.txt"))
                }
            }
        }
        for (let i = 1; i <= count; i++) {
            dir.add(new File(`file-${i}.txt`))
        }
    })
}
