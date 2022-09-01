// TODO: implement
export const Virtualizer = <T,>({
    items,
    renderItem,
}: {
    items: T[]
    itemHeight: number
    renderItem(item: T): React.ReactElement
}) => {
    return (
        <div>
            {items.map((item) => {
                return renderItem(item)
            })}
        </div>
    )
}
