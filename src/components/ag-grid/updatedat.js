import { format, isValid } from "date-fns"

export const UpdatedAt = ({ node }) => {
  let dateTime
  if (isValid(new Date(node.data.updatedat))) {
    dateTime = format(new Date(node.data.updatedat), "dd.MM.yyyy HH:mm")
  } else {
    dateTime = node.data.updatedat
  }
  return <span>{dateTime}</span>
}
