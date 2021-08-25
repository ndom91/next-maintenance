export const SupplierCidId = ({ node }) => {
  const displayIds = node.data.maintenancesupplier.reduce((acc, curr) => {
    acc.push(curr.suppliercircuit.derencid)
    return acc
  }, [])
  return <span>{displayIds.join(", ")}</span>
}
