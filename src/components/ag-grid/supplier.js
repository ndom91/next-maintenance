import { FlexboxGrid } from "rsuite"

export const Supplier = ({ node }) => {
  const { maildomain, name } = node.data.suppliercompany
  return (
    <FlexboxGrid justify="start" align="middle">
      <FlexboxGrid.Item>
        <img
          src={`https://www.google.com/s2/favicons?domain=${maildomain}`}
          style={{ padding: "5px" }}
          alt="Domain Favicon"
        />
      </FlexboxGrid.Item>
      <FlexboxGrid.Item>
        <span>{name}</span>
      </FlexboxGrid.Item>
    </FlexboxGrid>
  )
}
