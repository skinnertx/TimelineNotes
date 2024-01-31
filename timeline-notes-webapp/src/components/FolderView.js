


export default function FolderView({ data }) {


    return (
        <div>
            <h1>FolderView</h1>
            {data.children && (
                <ul>
                {data.children.map((child) => (
                    <p>{child.name}</p>
                ))}
                </ul>
            )}
        </div>
    )


}