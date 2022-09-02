import "./primitives.css"
import {createElement} from "react"

export const Button = ({
    className,
    children,
    text,
    ...rest
}: JSX.IntrinsicElements["button"] & {text?: string}) => {
    return (
        <button className={cx("button", className)} {...rest}>
            {children || text}
        </button>
    )
}

type IStack = JSX.IntrinsicElements["div"] & {
    as?: string
    gap?: number
    flex?: number
    align?: string
    justify?: string
    vertical?: boolean
    horizontal?: boolean
}
export const Stack = ({
    as = "div",
    className,
    gap,
    horizontal,
    vertical: _vertical,
    align,
    justify,
    flex,
    style: styleOverrides,
    ...rest
}: IStack) => {
    const style: React.CSSProperties = {}
    if (align) style.alignItems = align
    if (justify) style.justifyContent = justify
    if (gap) style.gap = gap * 0.25 + "rem"
    if (flex) {
        style.flex = 1
        style.minHeight = "0px"
        style.minWidth = "0px"
    }
    return createElement(as, {
        className: cx(horizontal ? "hstack" : "vstack", className),
        style: {...style, ...styleOverrides},
        ...rest,
    })
}

export const VStack = (props: IStack) => {
    return Stack({...props, vertical: true})
}

export const HStack = (props: IStack) => {
    return Stack({...props, horizontal: true})
}

export const cx = (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(" ")
}
